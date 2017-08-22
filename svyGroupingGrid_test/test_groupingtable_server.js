/**
 * @properties={typeid:24,uuid:"F5A2461A-A967-4773-AB02-78AA1E138A03"}
 */
function test_getJoin() {
	
	var query = datasources.db.example_data.orders.createSelect();
	var join = query.joins.add("orders_to_customers", "orders_to_customers");
	var joins = query.joins.getJoins()
	jsunit.assertEquals(1,joins.length);
	
	jsunit.assertTrue(getJoin(query,"orders_to_customers"));
}


/**
 * @properties={typeid:24,uuid:"865F6ECB-6035-47C8-8555-F6CD04055FA5"}
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
 * @properties={typeid:24,uuid:"37A659C1-F9F0-478B-A557-E8B46B8363AC"}
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
 * @properties={typeid:24,uuid:"25CD620B-898C-4CF5-AB62-C0CD726D4922"}
 */
function test_relatedDataProviders() {
	

	var sql = "select min(order_details.orderid) orderid, min(order_details.productid) productid\
	from order_details order_details \
	left outer join products order_details_to_products on order_details.productid=order_details_to_products.productid \
	left outer join categories products_to_categories on order_details_to_products.categoryid=products_to_categories.categoryid \
	group by products_to_categories.categoryname order by products_to_categories.categoryname asc";
	
	var fs = datasources.db.example_data.order_details.getFoundSet();
	fs.loadRecords(sql);
	

	var sql2 = "select min(order_details.orderid) orderid, min(order_details.productid) productid from order_details order_details left outer join products order_details_to_products on order_details.productid=order_details_to_products.productid group by order_details_to_products.productname order by order_details_to_products.productname asc"

	
	var sql3 = "select min(order_details.orderid), min(order_details.productid) \
				from order_details order_details \
				left outer join products order_details_to_products on order_details.productid=order_details_to_products.productid \
				left outer join categories order_details_to_products____products_to_categories on order_details_to_products.categoryid=order_details_to_products____products_to_categories.categoryid\
				left outer join suppliers order_details_to_products____products_to_suppliers on order_details_to_products.supplierid=order_details_to_products____products_to_suppliers.supplierid\
				where order_details_to_products____products_to_categories.categoryname LIKE 'Dairy Products'\
				group by order_details_to_products____products_to_suppliers.companyname\
				order by order_details_to_products____products_to_suppliers.companyname asc;"
		
	var sql4= "select min(order_details.orderid) orderid, min(o2.minproductid) productid \
				FROM \
						(SELECT min(order_details.productid) minproductid, products_to_categories.categoryname\
						FROM order_details order_details \
						left outer join products order_details_to_products on order_details.productid=order_details_to_products.productid \
						left outer join categories products_to_categories on order_details_to_products.categoryid=products_to_categories.categoryid \
						group by products_to_categories.categoryname order by products_to_categories.categoryname asc) AS o2,\
				 order_details left outer join products order_details_to_products on order_details.productid=order_details_to_products.productid \
				 left outer join categories products_to_categories on order_details_to_products.categoryid=products_to_categories.categoryid\
				 WHERE order_details.productid = o2.minproductid AND products_to_categories.categoryname = o2.categoryname\
				 group by products_to_categories.categoryname\
				 order by products_to_categories.categoryname asc"
		
	var sql5 = "select min(order_details.orderid) orderid, min(order_details.productid) productid FROM\
 order_details left outer join products order_details_to_products on order_details.productid=order_details_to_products.productid \
 left outer join categories products_to_categories on order_details_to_products.categoryid=products_to_categories.categoryid\
 WHERE order_details.productid = (\
		select order_details2.productid \
		 from order_details order_details2 \
		 left outer join products order_details_to_products2 on order_details2.productid=order_details_to_products2.productid \
		 left outer join categories products_to_categories2 on order_details_to_products2.categoryid=products_to_categories2.categoryid \
		 where products_to_categories2.categoryname = products_to_categories.categoryname and order_details2.orderid = order_details.orderid limit 1\
 )\
 group by products_to_categories.categoryname\
 order by products_to_categories.categoryname asc;"
	
	var dataset = databaseManager.getDataSetByQuery("example_data",sql5,[],-1);
	
	for (var i = 1; i <= dataset.getMaxRowIndex(); i++) {
		var row = dataset.getRowAsArray(i);
		application.output(row[0] + ' - ' + row[1]);
	}
	
	
	fs.loadRecords(sql5);

	for (var index = 1; index <= fs.getSize(); index++) {
		var record = fs.getRecord(index);
		application.output(record.orderid + ' - ' + record.productid);
	}
	
	//return fs;
	
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

