/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"DAFFB235-CF43-4EE5-81C5-DCA3DDEDDE61"}
 */
var searchText = "";

/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"C8052DCC-FA64-4A3A-B8DB-15009DAC5BC9"}
 */
var textcompanyName = '';

/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"93DA3C3E-D1C6-4ABB-86E4-E4AB2E1C0CBF"}
 */
var textContactName = '';

/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"D622E404-0E31-42F3-96D1-833F5F6BA6EA"}
 */
var textCountry = '';

/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"0A70ACF0-08B5-46A5-B869-4D5445844265"}
 */
var textCity = '';

/**
 * @properties={typeid:24,uuid:"42E40D92-FDB8-4EA6-AE16-10BC219D3F5A"}
 */
function applyFilters() { }

/**
 * @protected
 *
 * @properties={typeid:24,uuid:"B14E6392-CFDB-4859-BCCD-65D7730B49A6"}
 */
function onSearch() {
	applyFilters();
}

/**
 * @param {JSEvent} event
 * @protected
 *
 * @properties={typeid:24,uuid:"90606BC7-2C90-4C7B-B992-6288257F6E18"}
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
 * @properties={typeid:24,uuid:"E5D21698-3555-4E0F-B22F-A788C33A4F57"}
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
 * @properties={typeid:24,uuid:"C4627FC0-6DF4-4A9C-B9AA-301E7643B665"}
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
