--here am gonna putting a generale design of the the database design module (gonna design it by myself then correcting it and improving it using Ai model this is how you gonna trully learn )
-- 1. USERS TABLE
CREATE TABLE [user] (
    id          VARCHAR(50) PRIMARY KEY, -- UUID
    full_name   VARCHAR(100) UNIQUE NOT NULL,
    password    VARCHAR(255) NULL,
    role        INT DEFAULT 2000,
    avatar      VARCHAR(500) NULL,
    created_at  DATETIME2 DEFAULT GETDATE(),
    last_seen   DATETIME2 DEFAULT GETDATE()
);
