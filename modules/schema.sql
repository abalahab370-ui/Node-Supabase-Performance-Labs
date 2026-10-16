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

-- 2. POSTS TABLE (For Keyset Pagination & Search)
CREATE TABLE posts (
    post_id     VARCHAR(50) PRIMARY KEY, -- UUID
    user_id     VARCHAR(50) NOT NULL,
    title       VARCHAR(255) NOT NULL,
    body        VARCHAR(MAX) NOT NULL,
    view_count  INT DEFAULT 0,
    created_at  DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_posts_user FOREIGN KEY (user_id) REFERENCES [user](id) ON DELETE CASCADE
);

-- 3. INVENTORY TABLE (With Hard Engine Safety Checks)
CREATE TABLE Inventory ( 
    item_id        VARCHAR(50) PRIMARY KEY,
    item_name      VARCHAR(150) UNIQUE NOT NULL,
    stock          INT NOT NULL CHECK (stock >= 0),
    reserved_stock INT NOT NULL DEFAULT 0,
    created_at     DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT CHK_stock_bounds CHECK (reserved_stock <= stock AND reserved_stock >= 0)
);

-- 4. RESERVATION TABLE (For Concurrency Holds)
CREATE TABLE Reservation (
    reservation_id VARCHAR(50) PRIMARY KEY,
    user_id        VARCHAR(50) NOT NULL,
    item_id        VARCHAR(50) NOT NULL,
    state          VARCHAR(20) NOT NULL DEFAULT 'HELD', -- 'HELD', 'CONFIRMED', 'EXPIRED'
    created_at     DATETIME2 DEFAULT GETDATE(),
    expires_at     DATETIME2 NOT NULL,
    CONSTRAINT FK_res_user FOREIGN KEY (user_id) REFERENCES [user](id),
    CONSTRAINT FK_res_item FOREIGN KEY (item_id) REFERENCES Inventory(item_id)
);
-- the indexing stratigie :

--we have to go step by step on each table to figre out what we most add and config ! 

--USER TABLE  :
--we gonna do alot of search looking for name and password that matches then fetching all neccesser meta data about him so all we can add in non cluster index cuz the primary key exist here ! 

CREATE NONCLUSTERED INDEX  search_user_idex on [user] (full_name , password ) 
INCLUDE (id , full_name , avater ) ;

--Posts indexing : 
--for sure we gonna do search in order to find a specifique post based on fulltextable methode So we need index for that !

if not exists ( select * from sys.fulltext_catalogs where name ='search_posts')
create fulltext catalog search_posts as default ;

GO

CREATE FULLTEXT INDEX ON post ( 
      title LANGUAGE 1033 ,
      body LANGUAGE 1033 
)
KEY INDEX PK_posts
with stoplist = system ;
-- I Wanted to add full_name of the user but it seems like impossible cuz i have in that table only user_id and in the search i cant search for a user_id cuz am looking for text that matches a user name , So i dont know maybe like running a cte and main query each one handle a side then joining both results ?!

--Inventory Items Indexing :

--So here we basicly we gonna be looking for item name and stock and reserverd stock based on item name : 

CREATE NONCLUSTERED INDEX search_item_index on [inventory] (item_name , item_id) 
include (item_name , item_id , stock , reserved_stock) ;

--this indexes will slow down the writting process but helps in reading which will face match more load in production based on my thinking 
