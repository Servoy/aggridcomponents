/**
 * @type {String}
 *
 * @properties={typeid:35,uuid:"ECEBD878-B9E9-417B-A466-E564F328F4D8"}
 */
var valueColumn = 'sales';

/**
 * @properties={typeid:24,uuid:"F35B9DD5-6AC6-4BB9-87D2-5005DC289169"}
 */
function showPivot() {
	var ds = scopes.svyPivotDemo.getDataSet(false);
	elements.svypivot_1.pivot(
		ds, 
		['customer', 'product', 'supplier'], 
		['year'], 
		[valueColumn]);
	
//	elements.pivot.pivot(
//	ds, 
//	['customer', 'product', 'supplier'], 
//	['year'], 
//	[valueColumn]);
}

/**
 * @param {JSEvent} event
 * @param {number} value
 * @param {object} filters
 * @param {object[]} records
 *
 * @private
 *
 * @properties={typeid:24,uuid:"B5AE0ED2-3488-41DB-803D-E30FBE89EF19"}
 */
function onCellClicked(event, value, filters, records) {
	var filtersApplied = [];
	for (var f in filters) {
		filtersApplied.push(f + ': ' + filters[f]);
	}
	filtersApplied.sort();
	elements.result.text = 'click on ' + filtersApplied.join(', ');
}

/**
 * @properties={typeid:24,uuid:"64992B38-5F5B-48B5-81F1-397201E94CAE"}
 */
function exlude() {
	elements.svypivot_1.setExclusions({year: ['1996', '1997']})
}

/**
 * @properties={typeid:24,uuid:"0282507B-5963-459E-B23A-B2F550C8094C"}
 */
function include() {
	elements.svypivot_1.setInclusions({supplier: ['Bigfoot Breweries']})
}

/**
 * @properties={typeid:24,uuid:"FE5F6181-3577-4ACD-A975-C48A128FA3AE"}
 */
function setRows() {
	elements.svypivot_1.setRows(['customer', 'product'])
}

/**
 * @properties={typeid:24,uuid:"A65A3DD4-183B-4F4F-81A0-14FF70555D3D"}
 */
function setValues() {
	elements.svypivot_1.setValues(['price'])
}

/**
 * @properties={typeid:24,uuid:"1415E04C-92F5-4EB8-81B9-034697DCB5FA"}
 */
function setAggregator() {
//	elements.svypivot_1.setAggregator('Count', ['quantity'])
	elements.svypivot_1.setAggregator('Sum', ['quantity'])
//	elements.svypivot_1.setAggregator('Average')
}

/**
 * @param {JSEvent} event
 * @param {number} value
 * @param {object} filters
 * @param {object[]} records
 *
 * @private
 *
 * @properties={typeid:24,uuid:"46A29FF4-7C0E-4FB5-8D52-E4A952D97439"}
 */
function onCellDoubleClicked(event, value, filters, records) {
	var filtersApplied = [];
	for (var f in filters) {
		filtersApplied.push(f + ': ' + filters[f]);
	}
	filtersApplied.sort();
	elements.result.text = 'doubleclick on ' + filtersApplied.join(', ');
}

/**
 * Handle changed data, return false if the value should not be accepted. In NGClient you can return also a (i18n) string, instead of false, which will be shown as a tooltip.
 *
 * @param {String} oldValue old value
 * @param {String} newValue new value
 * @param {JSEvent} event the event that triggered the action
 *
 * @return {Boolean}
 *
 * @private
 *
 * @properties={typeid:24,uuid:"577E19BF-F40F-45A9-AE06-32A9F0E48531"}
 */
function onDataChange_value(oldValue, newValue, event) {
	showPivot();
	return true
}

/**
 * @param {JSEvent} event
 * @param {number} value
 * @param {object} filters
 * @param {object[]} records
 *
 * @private
 *
 * @properties={typeid:24,uuid:"8DAB8C43-7B50-494C-B1ED-247B95411323"}
 */
function onRightClick(event, value, filters, records) {
	var filtersApplied = [];
	for (var f in filters) {
		filtersApplied.push(f + ': ' + filters[f]);
	}
	filtersApplied.sort();
	elements.result.text = 'rightclick on ' + filtersApplied.join(', ');
	var popup = plugins.window.createPopupMenu();
	
	for (var r = 0; r < records.length; r++) {
		var recordDesc = [];
		for ( var p in records[r] ) {
			if (filters[p]) continue;
			recordDesc.push(p + ': ' + records[r][p]);
		}
		recordDesc.sort();
		popup.addMenuItem(recordDesc.join(', '));
	}
	popup.show(event.getX(), event.getY());
}
