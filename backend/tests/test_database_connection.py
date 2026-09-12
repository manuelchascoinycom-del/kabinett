import asyncio

import pytest
import pytest_asyncio
from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


@pytest_asyncio.fixture
async def async_database(tmp_path):
    database_path = tmp_path / "database.sqlite3"
    engine = create_async_engine(
        f"sqlite+aiosqlite:///{database_path}",
        pool_pre_ping=True,
    )
    connection_events = {"checkout": 0, "checkin": 0}

    @event.listens_for(engine.sync_engine, "checkout")
    def count_checkout(*_):
        connection_events["checkout"] += 1

    @event.listens_for(engine.sync_engine, "checkin")
    def count_checkin(*_):
        connection_events["checkin"] += 1

    async with engine.begin() as connection:
        await connection.execute(
            text("CREATE TABLE health_check (id INTEGER PRIMARY KEY, value INTEGER NOT NULL)")
        )
        await connection.execute(text("INSERT INTO health_check (value) VALUES (1)"))

    try:
        yield engine, async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
        ), connection_events
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_async_session_executes_query_and_closes(async_database):
    _, session_factory, connection_events = async_database

    async with session_factory() as session:
        result = await session.execute(text("SELECT value FROM health_check"))
        assert result.scalar_one() == 1

    assert connection_events["checkout"] > 0
    assert connection_events["checkin"] == connection_events["checkout"]


@pytest.mark.asyncio
async def test_concurrent_sessions_execute_and_close(async_database):
    _, session_factory, _ = async_database

    async def read_value():
        async with session_factory() as session:
            result = await session.execute(text("SELECT value FROM health_check"))
            return result.scalar_one()

    values = await asyncio.gather(*(read_value() for _ in range(10)))

    assert values == [1] * 10