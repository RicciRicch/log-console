begin;
select plan(1);
select ok(true, 'pgTAP radi');
select * from finish();
rollback;
