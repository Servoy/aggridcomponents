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
	
	var dataset = databaseManager.getDataSetByQuery(testQuery,-1);
	
	jsunit.assertEquals(dataset.getMaxRowIndex() , databaseManager.getFoundSetCount(childFoundset));
	
}


/**
 * @properties={typeid:24,uuid:"4327F0C1-02F5-4439-A920-01B3A736AA4E"}
 * @AllowToRunInFind
 */
function duplicateOrders() {
	
	var fs = datasources.db.example_data.orders.getFoundSet();
	fs.find()
	fs.customerid = 'ALFKI'
	fs.search()
	//fs.loadAllRecords();
	
	var f2 = fs.duplicateFoundSet();
	
	var cities = ['Rome', 'Milan', 'Thessaloniki', 'Athens', 'Amsterdam', 'Berlin', 'Paris', 'London', 'Madrid', 'Barcelona', 'Oslo', 'Alexandroupolis'];
	
	for (var j = 1; j <= 500; j++) {
		for (var i = 1; i < 2; i++) {
			var record = f2.getRecord(i);
			
			var idx = fs.newRecord(false, false)
			var order = fs.getRecord(idx);
			application.output(record.orderid + ' - ' + i + ' - ' + idx)

			databaseManager.copyMatchingFields(record, order);
			var x = Math.round(Math.random() * 10);
			order.shipcity = cities[x];
		}
		
		if (!databaseManager.saveData()) {
			throw 'cannot save'
		}
	}
}