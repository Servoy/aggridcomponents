/**
 * @properties={typeid:24,uuid:"B19A74B2-3A89-4AF2-8ECD-1F313DB8F995"}
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
