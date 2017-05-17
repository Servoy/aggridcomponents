/**
 * @enum
 * @protected 
 * @properties={typeid:35,uuid:"182F208A-C818-4414-BE3C-632C433095C6",variableType:-4}
 */
var MENU = {
	ORDERS : 'pagingGridOrders',
	PRODUCTS :	'pagingGridProducts',
	SUPPLIERS : 'pagingGridSuppliers',
	CUSTOMERS : 'pagingGridCustomers'
};

/**
 * @param {String} menuOption
 * @param {Array<{dataProvider:String, operator: String, value: String|Number}>} [filters]
 * @param {Number|String} [selectedPK]
 *
 * @properties={typeid:24,uuid:"03057CF9-C36C-44BE-A8E0-37D413475BCB"}
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
 * @properties={typeid:24,uuid:"784560F5-5F07-4F09-B14D-D7B40B7D5DB9"}
 */
function onAction(event) {
	// TODO Auto-generated method stub
	navigateTo(MENU.ORDERS);
}
