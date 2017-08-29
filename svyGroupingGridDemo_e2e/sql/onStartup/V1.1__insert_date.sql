-- CREATE TABLE SETUP (
--     ID int not null,
--     NAME varchar(100) not null
-- );

INSERT INTO test VALUES('Piet Peterson', 'IJmuiden', 'Nederland', (TO_TIMESTAMP('2014-07-02 06:14:00.742000000', 'YYYY-MM-DD HH24:MI:SS.FF')));

-- CREATE EXTENSION IF NOT EXISTS dblink;
-- INSERT INTO test
-- SELECT * FROM dblink('host=localhost port=5432 user=postgres dbname=flywaydemo2', 'SELECT * FROM "test"') 
-- AS t1(name text, country text, city text, date timestamp)
-- DROP EXTENSION IF EXISTS dblink;