/**
 * @properties={typeid:24,uuid:"5F081BBC-9459-4A03-951F-CCF2634FF054"}
 */
function allowFormIncludedInMenu() {
	return true;
}

/**
 *
 * @return {String}
 *
 * @properties={typeid:24,uuid:"7749A1EE-DC14-4B12-8133-A2052AAC1F35"}
 */
function getName() {
	return "Customer's orders";
}

/**
*
* @return {String}
*
* @properties={typeid:24,uuid:"3CC05D81-F428-492D-9E0E-6FD38B1F6A45"}
*/
function getDescription() {
	return "Example of table with grouped data on customer's orders";
}

/**
*
* @return {String}
*
* @properties={typeid:24,uuid:"AF2EB0CA-4E38-4B58-93A1-7D1856DC499F"}
*/
function getIconStyleClass() {
	return "fa fa-list-alt"
}


/**
 * @properties={typeid:24,uuid:"47558331-7C62-4A3F-86DF-C950665FDDDB"}
 */
function getParent() {
	return forms.agGridParentProvider;
}

/**
*
* @return {String} Website URL
*
* @properties={typeid:24,uuid:"DD0FDFE6-2A9E-47A5-AA5F-40790A4DC672"}
*/
function getWebSiteURL() {
	return 'https://github.com/Servoy/aggridcomponents';
}

/**
*
* @return {String} Additioanl info (wiki markdown supported)
*
* @properties={typeid:24,uuid:"5A5CF2C4-946A-47DC-9A59-E909FE980292"}
*/
function getMoreInfo() {
	var url = 'https://raw.githubusercontent.com/Servoy/aggridcomponents/master/README.md';
	return plugins.http.getPageData(url);
}

/**
*
* @return {String} Download URL
*
* @properties={typeid:24,uuid:"704B9DB5-D294-47A8-8DD6-8613F68B6B70"}
*/
function getDownloadURL() {
	return 'https://github.com/Servoy/aggridcomponents/releases/download/v1.0.2/svyGroupingGridDemo.servoy';
}