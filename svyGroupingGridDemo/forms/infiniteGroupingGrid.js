/**
 * Callback method for when form is shown.
 *
 * @param {Boolean} firstShow form is shown first time after load
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"9283E200-5E78-47E7-8BAD-CD44E221A2C3"}
 */
function onShow(firstShow, event) {

	elements.uigridfilter_1.root = foundset;
	elements.uigridfilter_1.groupings= [{
		field: "customerid",
		relation: "orders_to_orders$customerid",
		datasource: foundset.getDataSource()
	},{
		field: "shipcountry",
		relation: "orders_to_orders$shipcountry",
		datasource: foundset.getDataSource()
	},{
		field: "shipcity",
		relation: "orders_to_orders$shipcity",
		datasource: foundset.getDataSource()
	}];	
}

/**
 * @type {Object}
 *
 * @properties={typeid:35,uuid:"9F889554-CABC-4AF7-AEE5-BD60AA180069",variableType:-4}
 */
var rootFs;

/**
 *
 * @param {String} dataproviderName
 * @param {Boolean} grouping
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"57A5BF31-DCD6-4870-BDC0-6DE78C123B34"}
 */
function onGroupChanged(dataproviderName, grouping) {
	
	if (grouping) {
		
		if (dataproviderName === 'companyname') dataproviderName = 'customerid'

		var query = foundset.getQuery();
		var column = query.getColumn(dataproviderName);
		query.where.remove("grouping");
		
		// sorted by the given column
		query.result.clear();
		query.result.add(query.columns.orderid.min); // TODO get pk name
		
		// FIXME has side effect on the form's foundset
		query.groupBy.add(column);
		query.sort.clear();
		query.sort.add(column);

		foundset.loadRecords(query)
		return;

	}
}

/**
 *
 * @param {string} dataproviderName
 * @param {string} value
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"E93A03D0-A2F6-4AEF-88C8-6482657B3CBB"}
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