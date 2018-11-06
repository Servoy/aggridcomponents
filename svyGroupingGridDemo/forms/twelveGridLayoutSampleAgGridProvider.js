/**
 * @properties={typeid:24,uuid:"C1C8EC81-19A9-454D-A213-1C3C5F54C770"}
 */
function allowFormIncludedInMenu() {
	return true;
}

/**
 *
 * @return {String}
 *
 * @properties={typeid:24,uuid:"F99756D5-016B-430F-BB69-684E21352001"}
 */
function getName() {
	return "NG Grid Smart Layout";
}

/**
*
* @return {String}
*
* @properties={typeid:24,uuid:"FE7CF3D4-9589-41DE-BBD2-3C4BD8C1EC1D"}
*/
function getDescription() {
	return "Make best use of the available screen's space using the 12grid containers and NG Grid";
}

/**
*
* @return {String}
*
* @properties={typeid:24,uuid:"28C57C4E-C558-4BDD-AB7B-5EEFA91B24A9"}
*/
function getIconStyleClass() {
	return "fa fa-list-alt"
}

/**
 * @properties={typeid:24,uuid:"0A33EA6B-A2D6-431D-A7A4-B3C9EFED2023"}
 */
function getParent() {
	return forms.agGridParentProvider;
}

/**
*
* @return {String} Website URL
*
* @properties={typeid:24,uuid:"7CE434F8-424F-4826-9DD7-70099E4CA6F3"}
*/
function getWebSiteURL() {
	return 'https://github.com/Servoy/aggridcomponents';
}

/**
*
* @return {String} Additioanl info (wiki markdown supported)
*
* @properties={typeid:24,uuid:"CA02FF3A-B8CB-4DF7-BCA3-1109A64F1D9C"}
*/
function getMoreInfo() {
	var url = 'https://raw.githubusercontent.com/Servoy/aggridcomponents/master/README.md';
	return plugins.http.getPageData(url);
}

/**
*
* @return {String} Download URL
*
* @properties={typeid:24,uuid:"9A5E10EB-1743-4C71-A948-B8947C869B93"}
*/
function getDownloadURL() {
	return 'https://github.com/Servoy/aggridcomponents/releases/download/v1.0.2/svyGroupingGridDemo.servoy';
}
