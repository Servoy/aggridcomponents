/**
 * @properties={typeid:24,uuid:"042689FF-5CFE-4652-A49E-104F29D15050"}
 */
function test_groupOrders() {

	var parentFoundset = datasources.db.example_data.orders.getFoundSet();
	parentFoundset.loadAllRecords()

	/** @type {QBSelect} */
	var query = parentFoundset.getQuery();

	var groupColumn;
	var groupDataprovider = 'customerid';
	groupColumn = query.getColumn(groupDataprovider);

	// this is the first grouping operation; alter initial query to get all first level groups

	var pkColumns = query.result.getColumns();

	query.result.clear();
	// Group pks handle pks
	for (var i = 0; i < pkColumns.length; i++) {
		query.result.add(pkColumns[i].min);
	}
	//	query.result.add(query.getColumn('orderid').min, 'orderid')
	//query.result.distinct = true;
	//query.result.add(groupColumn);
	query.groupBy.add(groupColumn);
	query.sort.clear();
	query.sort.add(groupColumn);

	var childFoundset = parentFoundset.duplicateFoundSet();
	childFoundset.loadRecords(query);
	application.output(databaseManager.getSQL(childFoundset));
	application.output(databaseManager.getSQLParameters(childFoundset));

	var testQuery = datasources.db.example_data.orders.createSelect();
	testQuery.result.add(testQuery.columns.customerid);
	testQuery.result.distinct = true;

	var dataset = databaseManager.getDataSetByQuery(testQuery, -1);

	jsunit.assertEquals(dataset.getMaxRowIndex(), databaseManager.getFoundSetCount(childFoundset));

}

/**
 * @properties={typeid:24,uuid:"4327F0C1-02F5-4439-A920-01B3A736AA4E"}
 * @AllowToRunInFind
 */
function duplicateOrders(customerid, copies) {

	if (!customerid) customerid = 'ALFKI'
	if (!copies) copies = 500;

	var fs = datasources.db.example_data.orders.getFoundSet();
	if (fs.find()) {
		fs.customerid = customerid;
		fs.search()
	} else {
		fs.loadAllRecords();
	}

	var f2 = fs.duplicateFoundSet();

	databaseManager.setAutoSave(false);
	var cities = ['Rome', 'Milan', 'Thessaloniki', 'Athens', 'Amsterdam', 'Berlin', 'Paris', 'London', 'Madrid', 'Barcelona', 'Oslo', 'Alexandroupolis'];

	for (var j = 1; j <= copies; j++) {
		for (var i = 1; i < 2; i++) {
			var record = f2.getRecord(i);

			var idx = fs.newRecord(false, false)
			var order = fs.getRecord(idx);
			// application.output(record.orderid + ' - ' + i + ' - ' + idx)

			databaseManager.copyMatchingFields(record, order);
			var x = Math.round(Math.random() * 10);
			order.shipcity = cities[x];
		}
		if (j % 200 === 0) {
			if (!databaseManager.saveData()) {
				throw 'cannot save'
			}
		}
	}
	f2.clear();
	databaseManager.setAutoSave(true);
	application.output('Populate ' + customerid + ' ' + copies);

}

/**
 * @properties={typeid:24,uuid:"74CC03B4-41E3-4047-959C-C1D3330726DD"}
 */
function generateOrders() {
	
	var fs = datasources.db.example_data.customers.getFoundSet();
	fs.loadAllRecords();
	
	for (var i = 1; i <= fs.getSize(); i++) {
		var record = fs.getRecord(i);
		var x = Math.round(Math.random() * 500);
		duplicateOrders(record.customerid, x);
	}
}

/**
 * @properties={typeid:24,uuid:"77EA272E-0AFB-4BFB-9585-F5F7C72B9A00"}
 */
function generateOrderDetails() {
	databaseManager.setAutoSave(false);

	
	var sql = 'select orderid from orders where orderid not in (select orderid from order_details)'//'select orderid from orders where orderid > ?'
	var fsOrders = datasources.db.example_data.orders.getFoundSet();
	fsOrders.loadRecords(sql, []);
	
	var fsChild =  datasources.db.example_data.order_details.getFoundSet();
	fsChild.loadAllRecords();
	
	var fs =  datasources.db.example_data.order_details.getFoundSet();
	
	var child;
	var k = 1;
	for (var i = 1; i <= fsOrders.getSize(); i++) {
		var order = fsOrders.getRecord(i);
		application.output('Create order ' + order.orderid + ' k ' + k)

		var count = Math.round(Math.random() * 10);
		
		// generate order details for each order
		for (var j = 0; j < count ; j++) {
			if (k > fsChild.getSize())  {
				k = 1;
			}
			child = fsChild.getRecord(k);
			
			var newOrderDetail = fs.getRecord(fs.newRecord());
			
			databaseManager.copyMatchingFields(child, newOrderDetail, true);
			newOrderDetail.orderid = order.orderid;
			k++;
		}
		
	//	if (i % 50 === 0) {
			if (!databaseManager.saveData()) {
				application.output('cannot save some records ');
				databaseManager.revertEditedRecords();
				// throw 'cannot save'
			} else {
				
			}
//		}
		
	}

	databaseManager.setAutoSave(true);

}
