/**
 * @properties={typeid:24,uuid:"E4D2DEFC-9000-4EEF-B4B6-609606A4E277"}
 */
function test_getJoin() {
	
	var query = datasources.db.example_data.orders.createSelect();
	var join = query.joins.add("orders_to_customers", "orders_to_customers");
	var joins = query.joins.getJoins()
	jsunit.assertEquals(1,joins.length);
	
	jsunit.assertTrue(getJoin(query,"orders_to_customers"));
}


/**
 * @properties={typeid:24,uuid:"FF1312B8-3913-440C-9AC9-5A2E7575EBBF"}
 */
function test_getJoinFromFoundset() {
	
	var query = datasources.db.example_data.orders.createSelect();
	query.result.addPk();
	var join = query.joins.add("orders_to_customers", "orders_to_customers");
	query.where.add(join.getColumn("city").eq('London'));
	
	var fs = datasources.db.example_data.orders.getFoundSet()
	fs.loadRecords(query)
	var queryb = fs.getQuery();
	
	var joins = queryb.joins.getJoins()
	jsunit.assertEquals(1, joins.length);
	jsunit.assertNotNull(getJoin(queryb, "orders_to_customers"));
}

/**
 * @param {QBSelect} query
 * @param {String} alias
 *
 * @return {QBJoin}
 * *
 * @properties={typeid:24,uuid:"993DEE14-4342-46E6-81F9-F249CE5262F5"}
 */
function getJoin(query, alias) {
	var joins = query.joins.getJoins();	
	for (var i = 0; i < joins.length; i++) {
		var join = joins[i];
		if (join.getTableAlias() == alias) {
			return join;
		}
	}
	return null;
}