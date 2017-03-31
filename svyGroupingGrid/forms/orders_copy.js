/**
 * Callback method for when form is shown.
 *
 * @param {Boolean} firstShow form is shown first time after load
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"92728708-D115-452F-AFB3-5FE3FE0B112A"}
 */
function onShow(firstShow, event) {
	// TODO Auto-generated method stub
	elements.dbtreeview.bindings = [{
		datasource: databaseManager.getDataSource('example_data', 'customers'),
		nrelationname : 'customers_to_orders',
		textdataprovider: "customerid"
	},{
		datasource: databaseManager.getDataSource('example_data', 'orders'),
		textdataprovider: "orderid"
		
	}];
	elements.dbtreeview.addRoots(foundset);
	elements.dbtreeview.refresh();
	
	return;
}

/**
 *
 * @param {string} dataproviderName
 * @param {true} grouping
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"D965F6CC-2FC7-4767-9026-93FA747671EF"}
 */
function onGroupChanged(dataproviderName, grouping) {
	
//	foundset.sort(dataproviderName);
	return;
	
	if (grouping) {
		var fs = foundset.duplicateFoundSet();
		//fs.sort(dataproviderName + ' asc');
		//fs.loadRecords();
		
		//if(fs.find()) {
			// fs[dataproviderName]
		//}
		
		// TODO handle relation
		var query = foundset.getQuery();
		var column = query.getColumn(dataproviderName);
		query.where.remove("grouping");
		
		// sorted by the given column
		query.result.clear();
		query.result.distinct = true
		query.result.add(column);
		query.sort.clear();
		query.sort.add(column);
		application.output(databaseManager.getSQL(query));
		
		// TODO how does it load the next chunk ?
		var ds = databaseManager.getDataSetByQuery(query,10);
		var pks = ds.getColumnAsArray(1);
		
		var fsQuery = foundset.getQuery();
		fsQuery.where.remove("grouping");
		fsQuery.where.add("grouping", column.isin(pks));
		// has to reduce the query.
		
		foundset.loadRecords(fsQuery);
		
	}
}

/**
 *
 * @param {string} dataproviderName
 * @param {string} value
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"0838FE38-A096-4DFC-BC1C-886B388B4CAB"}
 */
function onNodeExpanded(dataproviderName, value) {

}
