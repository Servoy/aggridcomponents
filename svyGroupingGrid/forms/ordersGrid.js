/**
 * Callback method for when form is shown.
 *
 * @param {Boolean} firstShow form is shown first time after load
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"5CFFAA35-9381-4536-AA3C-CE33457C296E"}
 */
function onShow(firstShow, event) {

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
 * @properties={typeid:35,uuid:"00D840A9-A396-4E36-B614-0326B9B1C547",variableType:-4}
 */
var rootFs;

/**
 *
 * @param {String} dataproviderName
 * @param {Boolean} grouping
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"38055A16-2926-4FC2-A7A9-ACA636E4BE59"}
 */
function onGroupChanged(dataproviderName, grouping) {
	
	if (grouping) {

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
 * @properties={typeid:24,uuid:"38964342-6680-495B-84A9-2DA7211AA561"}
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
