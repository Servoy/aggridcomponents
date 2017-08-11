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

/**
 * @properties={typeid:24,uuid:"05656A89-052A-45E4-8C89-0FCD7F3037DA"}
 */
function test_relatedDataProviders() {
	

	var sql = "select min(order_details.orderid) orderid, min(order_details.productid) productid\
	from order_details order_details \
	left outer join products order_details_to_products on order_details.productid=order_details_to_products.productid \
	left outer join categories products_to_categories on order_details_to_products.categoryid=products_to_categories.categoryid \
	group by products_to_categories.categoryname order by products_to_categories.categoryname asc";
	
	var fs = datasources.db.example_data.order_details.getFoundSet();
	fs.loadRecords(sql);
	
	var dataset = databaseManager.getDataSetByQuery("example_data",sql,[],-1);
	
	for (var i = 1; i <= dataset.getMaxRowIndex(); i++) {
		var row = dataset.getRowAsArray(i);
		application.output(row[0] + ' - ' + row[1]);
	}
	
	var sql2 = "select min(order_details.orderid) orderid, min(order_details.productid) productid from order_details order_details left outer join products order_details_to_products on order_details.productid=order_details_to_products.productid group by order_details_to_products.productname order by order_details_to_products.productname asc"

	
	var sql3 = "select min(order_details.orderid), min(order_details.productid) \
				from order_details order_details \
				left outer join products order_details_to_products on order_details.productid=order_details_to_products.productid \
				left outer join categories order_details_to_products____products_to_categories on order_details_to_products.categoryid=order_details_to_products____products_to_categories.categoryid\
				left outer join suppliers order_details_to_products____products_to_suppliers on order_details_to_products.supplierid=order_details_to_products____products_to_suppliers.supplierid\
				where order_details_to_products____products_to_categories.categoryname LIKE 'Dairy Products'\
				group by order_details_to_products____products_to_suppliers.companyname\
				order by order_details_to_products____products_to_suppliers.companyname asc;"
		
	fs.loadRecords(sql3);

	return fs;
	
	jsunit.assertTrue(dataset.getMaxRowIndex() > 0);
	jsunit.assertTrue(dataset.getMaxRowIndex() > 1);
	
	jsunit.assertTrue(fs.getSize() > 0);
	jsunit.assertTrue(fs.getSize() > 1);

	var query = datasources.db.example_data.order_details.createSelect();
	var joinProducts = query.joins.add("order_details_to_products","order_details_to_products");
	var joinCategories = joinProducts.joins.add("products_to_categories","products_to_categories");
	var groupColumn = joinCategories.getColumn("categoryname");
	//var groupColumn = joinProducts.getColumn("productname");
	
	// get the pks
	query.result.clear();
	query.result.addPk();
	var pkColumns = query.result.getColumns();
	query.result.clear();

	// Group pks handle pks
	for (var i = 0; i < pkColumns.length; i++) {
		query.result.add(pkColumns[i].min);
	}
	query.groupBy.add(groupColumn);
	query.sort.clear();
	query.sort.add(groupColumn);
	
	fs.loadRecords(query);

	return fs;
}

