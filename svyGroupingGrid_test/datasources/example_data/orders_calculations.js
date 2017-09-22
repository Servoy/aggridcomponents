/**
 * @properties={type:12,typeid:36,uuid:"24CA512D-7E07-43F6-8F39-A48D67AE616F"}
 */
function styleClassDataprovider() {
	if (shipcity < 'F') {
		return 'blue-cell'
	}  else if (shipcity > 'O') {
		return 'green-cell'
	} else {
		return 'red-cell'
	}
}
