
/**
 * @param {JSEvent} event
 *
 * @protected
 *
 * @properties={typeid:24,uuid:"1BB3A357-5111-4485-AB27-3061D648C52F"}
 */
function onUpdateRowHeight(event) {
	if (elements.groupingtable.responsiveHeight == 300) { 
		elements.groupingtable.responsiveHeight = 500;
	} else {
		elements.groupingtable.responsiveHeight = 300; 
	}
}
