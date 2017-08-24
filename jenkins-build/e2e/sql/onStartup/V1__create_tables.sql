-- insert into SETUP (ID, NAME) values (1, 'Axel');
-- insert into SETUP (ID, NAME) values (2, 'Mr. Foo');
-- insert into SETUP (ID, NAME) values (3, 'Ms. Bar');
CREATE TABLE IF NOT EXIST test(name text, country text, city text, date timestamp without time zone);

-- CREATE EXTENSION IF NOT EXISTS dblink;
-- INSERT INTO test
-- SELECT * FROM dblink('host=localhost port=5432 user=postgres dbname=flywaydemo2', 'SELECT * FROM "test"') 
-- AS t1(name text, country text, city text, date timestamp)
-- DROP EXTENSION IF EXISTS dblink;