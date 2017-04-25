
/**
 * Callback method for when form is shown.
 *
 * @param {Boolean} firstShow form is shown first time after load
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"CB540D95-0A2D-4131-AEBE-92390538DBA7"}
 */
function onShow(firstShow, event) {
	// TODO Auto-generated method stub
//	elements.dbtreeview_3.bindings = [{
//		datasource: databaseManager.getDataSource('example_data', 'orders'),
//		nrelationname : 'orders_to_order_details',
//		textdataprovider: "orderid"
//	}, {
//		datasource: databaseManager.getDataSource('example_data', 'order_details'),
//		textdataprovider: "productid"
//		
//	}]
//	//elements.dbtreeview_3.setNRelationName(databaseManager.getDataSource('example_data', 'order_details'), 'orders_to_order_details');
//	elements.dbtreeview_3.addRoots(foundset);

	
//	elements.dbtreeview.bindings = [{
//		datasource: databaseManager.getDataSource('example_data', 'customers'),
//		nrelationname : 'customers_to_orders',
//		textdataprovider: "customerid"
//	},{
//		datasource: databaseManager.getDataSource('example_data', 'orders'),
//		textdataprovider: "orderid"
//		
//	}];
	
//	var fs = databaseManager.getFoundSet("db:/example_data/customers");
//	fs.loadAllRecords()
//	elements.dbtreeview.addRoots(fs);
//	//elements.dbtreeview.refresh();
	
	elements.uigridfilter_1.root = foundset;
	elements.uigridfilter_1.groupings= [{
		field: "customerid",
		relation: "orders_to_orders$customerid",
		datasource: foundset.getDataSource()
	}];
	
	return;
}

/**
 * @type {Object}
 *
 * @properties={typeid:35,uuid:"9D0CA528-D1AB-4B6A-AE83-3F9C1D193B4D",variableType:-4}
 */
var rootFs;

/**
 *
 * @param {string} dataproviderName
 * @param {true} grouping
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"27E21902-4B7D-44EE-8DE9-CB6E583B7B0B"}
 */
function onGroupChanged(dataproviderName, grouping) {
	
//	foundset.sort(dataproviderName);
	if (grouping) {
		// var fs = foundset.duplicateFoundSet();
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
		query.result.add(query.columns.orderid.min); // TODO get pk name
	//	query.result.add(column);
		query.groupBy.add(column);
		query.sort.clear();
		query.sort.add(column);
		application.output(databaseManager.getSQL(query));
		
		
		// TODO how does it load the next chunk ?
		var ds = databaseManager.getDataSetByQuery(query,10);
		var pks = ds.getColumnAsArray(1);
		
//		var fsQuery = foundset.getQuery();
//		fsQuery.where.remove("grouping");
//		fsQuery.where.add("grouping", column.isin(pks));
		// has to reduce the query.
		
		foundset.loadRecords(query)
		return;
		
		
		var fs = databaseManager.getFoundSet(query);
		fs.loadAllRecords()
		rootFs = fs;
		elements.uigridfilter_1.root = rootFs;
		elements.uigridfilter_1.myFoundset = rootFs;
		
	}
}


/**
*
* @param {string} dataproviderName
* @param {true} grouping
* @deprecated 
*
* @protected
*
* @properties={typeid:24,uuid:"13FA2C70-0DDE-4A9F-8142-C6ECBCC12E24"}
*/
function onGroupChangedDeprecated(dataproviderName, grouping) {
	
//	foundset.sort(dataproviderName);
	
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
 * @properties={typeid:24,uuid:"B6E2E5AC-4C45-4DB3-A071-F484A3611140"}
 */
function onNodeExpanded(dataproviderName, value) {

	/* 
	 * Select Distinct pk from orders limit 200.
	 * 
	 * 1' Group:
	 * 
	 * Select distinc min(pk), cid from orders limit 200
	 * 
	 * 2' Group:
	 * 
	 * Select distinct min(pk), city from orders where cid = ? limit 200
	 * 
	 * 3 Expand leaf
	 * 
	 * Select pk from orders where cid = ? and city = ? limit 200
	 * 
	 * 
	 * */
	
}


/**
 * Perform the element default action.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"F277DF06-1455-44E8-B112-47684F1B6203"}
 */
function onAction(event, action) {
	// TODO Auto-generated method stub
}
