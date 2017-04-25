/**
 * @enum
 * @protected 
 * @properties={typeid:35,uuid:"97312305-FAD7-4A0C-A8AB-74299D7BC048",variableType:-4}
 */
var MENU = {
	ORDERS : 'uigridOrders',
	PRODUCTS :	'uigridProducts',
	SUPPLIERS : 'uigridSuppliers',
	CUSTOMERS : 'uigridCustomers'
}

/**
 * @param {String} menuOption
 * @param {Array<{dataProvider:String, operator: String, value: String|Number}>} [filters]
 * @param {Number|String} [selectedPK]
 *
 * @properties={typeid:24,uuid:"C592A476-CFD4-4B17-A64E-1E94D075AEC8"}
 */
function navigateTo(menuOption, filters, selectedPK) {

	
	/** @type {RuntimeForm<uigridBase>} */
	var form = forms[menuOption]
	if (form) {
//		if (selectedPK) {
//			form.selectRecord(selectedPK);
//		}
	} else {
		return;
	}
	elements.tabpanel_1.removeAllTabs();
	elements.tabpanel_1.addTab(form);
	
	//	apply filters
	var filterName = 'filters'; 
	form.foundset.removeFoundSetFilterParam(filterName);
	if(filters){
		for(var i in filters){
			if(!form.foundset.addFoundSetFilterParam(filters[i].dataProvider,filters[i].operator,filters[i].value, filterName)){
				application.output('Failed to addd filter: ' + filters[i],LOGGINGLEVEL.WARNING);
			}
		}
		form.foundset.loadAllRecords();
	}
	application.output(databaseManager.getSQL(form.foundset));
	application.output(databaseManager.getSQLParameters(form.foundset));	
	//	apply selection
	//	if(selectedPK){
	//		form.foundset.selectRecord(selectedPK);
	//	}
	
}
	


/**
 * Perform the element default action.
 *
 * @param {JSEvent} event the event that triggered the action
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"936F8B73-7855-405A-B294-06A6AEA5540A"}
 */
function onAction(event) {
	// TODO Auto-generated method stub
	navigateTo(MENU.ORDERS);
}
