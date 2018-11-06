/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"EDD0478F-AF54-4143-9A6E-AC5FFD15D15D"}
 */
var searchText = "";

/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"F030A012-0618-4A6C-B3A7-A1031D202951"}
 */
var textcompanyName = '';

/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"BD6EFE7D-2FC1-4CC9-8849-B84D0297C9B1"}
 */
var textContactName = '';

/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"11EDE57D-7B0F-4E86-BDB8-9BF73FE8689A"}
 */
var textCountry = '';

/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"53FECDD1-FA05-4353-B284-2E6557FC6766"}
 */
var textCity = '';

/**
 * @properties={typeid:24,uuid:"14E4D008-268B-4481-A5A2-B2D140D6807D"}
 */
function applyFilters() { }

/**
 * @protected
 *
 * @properties={typeid:24,uuid:"047BA150-084D-4592-A6F2-AF41E7496F29"}
 */
function onSearch() {
	applyFilters();
}

/**
 * @param {JSEvent} event
 * @protected
 *
 * @properties={typeid:24,uuid:"F529FBA4-EF76-42DD-8B07-00BA1EB7530F"}
 */
function onGlobalSearch(event) {
	application.output(searchText)
	if (searchText) {
		var search = scopes.svySearch.createSimpleSearch(foundset.getDataSource());
		search.addSearchProvider('companyname');
		search.addSearchProvider('contactname');
		search.setSearchText(searchText);
		var query = search.getQuery();
		foundset.loadRecords(query);
	} else {
		foundset.loadAllRecords()
	}
}

/**
 * Called whenever a menu item is clicked or a submenu item is selected with the JSEvent and the menuItem object clicked on.
 *
 * @param {JSEvent} event
 * @param {bootstrapextracomponents-navbar.menuItem} menuItem
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"B1D8A294-68D0-4E2A-9799-BC4AD9FD9CA5"}
 */
function onMenuItemClicked(event, menuItem) {
	// TODO Aut

	
	var wc = form.getWebComponent('mycomponent');
	wc.setHandler('onActionMethodID', form.getMethod('onAction'));
	
	
	var form = solutionModel.newForm('newForm1', myDatasource, null, true, 800, 600);
	var method = form.newMethod('function aMethod(event){application.output("Hello world!");}');
	var button = myListViewForm.newButton('Show message!', 50, 50, 100, 30, method);
	forms['newForm1'].controller.show();
}

/**
 * @param {JSEvent} event
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"5C315DDA-C692-42F3-A35A-BD3E005F550A"}
 */
function onFilterSearch(event) {
	
	var query = datasources.db.example_data.customers.createSelect();
	query.result.addPk()
	if (textcompanyName) {
		query.where.add(query.columns.companyname.upper.like("%" + textcompanyName.toUpperCase() +"%"));
	}
	if (textContactName) {
		query.where.add(query.columns.contactname.upper.like("%" + textContactName.toUpperCase() +"%"));
	}
	if (textCity) {
		query.where.add(query.columns.city.upper.like("%" + textCity.toUpperCase() +"%"));
	}
	if (textCountry) {
		query.where.add(query.columns.country.upper.like("%" + textCountry.toUpperCase() +"%"));
	}
	foundset.loadRecords(query)

}
