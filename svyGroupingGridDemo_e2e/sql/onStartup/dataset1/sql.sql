BEGIN TRANSACTION;
CREATE OR REPLACE FUNCTION calc_difference(date_snapshot timestamp) RETURNS integer AS $$ 
SELECT (((DATE_PART('day', CURRENT_TIMESTAMP::timestamp - date_snapshot::timestamp)::integer * 24 + 
DATE_PART('hour', CURRENT_TIMESTAMP::timestamp - date_snapshot::timestamp))::integer * 60 + 
DATE_PART('minute', CURRENT_TIMESTAMP::timestamp - date_snapshot::timestamp))::integer * 60 + 
DATE_PART('second', CURRENT_TIMESTAMP::timestamp - date_snapshot::timestamp))::integer 
$$ LANGUAGE SQL;

UPDATE "public"."Orders" SET orderdate = orderdate + (SELECT calc_difference('2017-6-26 13:23:00') || ' second')::interval
;

UPDATE "public"."Orders" SET orderdate = orderdate + (SELECT calc_difference('2017-6-26 13:23:00') || ' second')::interval
WHERE id = 1;
COMMIT;