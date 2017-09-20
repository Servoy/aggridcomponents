/**
 * @public
 * @constructor
 *
 * @properties={typeid:24,uuid:"05DF6BE8-9FD0-4485-AC89-A988D6F1B397"}
 */
function GroupNode(id) {
	this.id = id;
	this.nodes = new Object();
	this.foundsetUUID = undefined;

	var thisInstance = this;

	/**
	 * @public
	 * @param {Function} callback execute function for each subnode. Arguments GroupNode
	 *  */
	this.forEach = function(callback) {
		for (var key in this.nodes) {
//			application.output(this.nodes[key].foundsetUUID);
			callback.call(this, this.nodes[key]);
		}
	}

	/**
	 * @public
	 * @return {Boolean} returns true if the callback ever returns true
	 * @param {Function} callback execute function for each subnode until returns true. Arguments GroupNode
	 *  */
	this.forEachUntilSuccess = function(callback) {
		for (var key in this.nodes) {
//			application.output(this.nodes[key].foundsetUUID);
			if (callback.call(this, this.nodes[key]) === true) {
				return true;
			}
		}
		// return true only if there are no subnodes ?
		return false;
	}

	/**
	 * @public
	 * @return {Boolean} returns true if the callback ever returns true
	 *  */
	this.hasNodes = function() {
		for (var key in this.nodes) {
			return true;
		}
		return false;
	}

	/**
	 * @public
	 * @remove the node
	 * */
	this.destroy = function() {

		application.output('--Destroy ' + this.foundsetUUID  + ' - id : ' + this.id);
		// destroy all it's sub nodes
		this.removeAllSubNodes();

		// do nothing if the foundset doesn't exist
		if (this.foundsetUUID && this.foundsetUUID !== 'root') {
			// TODO should this method access the foundsetManager ? is not a good encapsulation
			//		if (this.onDestroy) {
			//			this.onDestroy.call(this, [this.id, this.foundsetUUID]);
			//		}
			var foundsetManager = getFoundsetManagerByFoundsetUUID(this.foundsetUUID);
			foundsetManager.destroy();
		}
	}
	
	this.removeAllSubNodes = function() {
		this.forEach(function (subNode) {
			subNode.destroy();
		});
		this.nodes = [];
	}
}

/**
 * @properties={typeid:24,uuid:"59BC4702-4A13-4644-B132-EA0D715B73E5"}
 */
function GroupHashCache() {

	var rootGroupNode = new GroupNode('root');

	// methods
	this.getCachedFoundset;
	this.setCachedFoundset;
	this.clearAll;
	this.removeCachedFoundset;
	this.removeCachedFoundsetAtLevel;
	this.removeChildFoundsets;

	// TODO rename in foundsetUUID
	this.getCachedFoundset = function(rowGroupCols, groupKeys) {
		var node = getTreeNode(rootGroupNode, rowGroupCols, groupKeys);
		return node ? node.foundsetUUID : null;
	}

	this.setCachedFoundset = function(rowGroupCols, groupKeys, foundsetUUID) {
		var tree = getTreeNode(rootGroupNode, rowGroupCols, groupKeys, true);
		tree.foundsetUUID = foundsetUUID;
	}

	/**
	 * @param {String} foundsetUUID
	 * Remove the node */
	this.removeCachedFoundset = function(foundsetUUID) {
		return removeFoundset(rootGroupNode, foundsetUUID);
	}

	/**
	 * @param {Number} level
	 * Remove the node */
	this.removeCachedFoundsetAtLevel = function(level) {
		return removeFoundsetAtLevel(rootGroupNode, level);
	}

	/**
	 * @param {String} foundsetUUID
	 * @param {String} [field]
	 * @param {String} [value]
	 * Remove all it's child node */
	this.removeChildFoundset = function(foundsetUUID, field, value) {
		return removeChildFoundsets(rootGroupNode, foundsetUUID, field, value);
	}

	this.clearAll = function() {

		rootGroupNode.forEach(function(node) {
			if (node.foundsetUUID) {
				removeFoundset(rootGroupNode, node.foundsetUUID);
			} else {
				// TODO is it this possible
				$log.error('There is a root node without a foundset UUID, it should not happen');
			}

		});
		if ($scope.model.hashedFoundsets.length > 0) {
			$log.error("Clear All was not successful, please debug");
		}
	}

	/**
	 * @param {GroupNode} tree
	 * @param {String} foundsetUUID
	 * @return Boolean
	 *  */
	function removeFoundset(tree, foundsetUUID) {
		if (!tree) {
			return true;
		}

		if (!foundsetUUID) {
			return true;
		}
		
		// remove the node
		var parentNode = getParentGroupNode(tree, foundsetUUID);
		var node = getGroupNodeByFoundsetUUID(parentNode, foundsetUUID);
		if (parentNode && node) {
			node.destroy();
			// TODO should be moved inside the destroy method ?, each time should ask for each parent
			delete parentNode.nodes[node.id];
			return true;
		} else {
			return false;
		}
	}
	
	/**
	 * @param {GroupNode} tree
	 * @param {Number} level
	 * @return {Boolean}
	 *  */
	function removeFoundsetAtLevel(tree, level) {
		if (!tree) {
			return true;
		}

		if (isNaN(level) || level === null) {
			return true;
		}
		
		var success = true;

		tree.forEach(function(node) {
			
			// remove the foundset and all it's child nodes if foundsetUUID or level === 0
			if (level === 0) {
				var id = node.id;
				node.destroy();
				delete tree.nodes[id];
				return true;
			} else {
				success = node.forEach(function(subNode) {
					return removeFoundsetAtLevel(node, level - 1)
				}) && success;
				return success;
			}
		});
		return success;
	}

	/**
	 * @param {GroupNode} tree
	 * @param {String} foundsetUUID
	 * @param {String} [field]
	 * @param {String} [value]
	 *  */
	function removeChildFoundsets(tree, foundsetUUID, field, value) {

		if (foundsetUUID) {
			// remove all child nodes
			var node = getGroupNodeByFoundsetUUID(tree, foundsetUUID);
			if (node) {
				node.removeAllSubNodes();
				return true;
			} else {
				return false;
			}
		} else {
			
			// TODO Refactor this part of code
			var success = true;
			tree.forEach(function(node) {
				if (node.foundsetUUID === foundsetUUID) {
					// delete all subnodes
					success = true;
					node.forEach(function(subNode) {
						var childFoundsetUUID = subNode.foundsetUUID;
						var foundsetRef = getFoundsetManagerByFoundsetUUID(childFoundsetUUID);
						// FIXME this solution is horrible, can break if rows.length === 0 or...
						// A better solution is to retrieve the proper childFoundsetUUID by rowGroupCols/groupKeys
						if (foundsetRef && ( (field === null || field === undefined) || (field !== null && field !== undefined && foundsetRef.foundset.viewPort.rows[0] && foundsetRef.foundset.viewPort.rows[0][field] == value))) {
							success = (removeFoundset(node, childFoundsetUUID) && success);
						} else {
							$log.debug('ignore the child foundset');
						}
					});
				} else if (node.hasNodes()) { // search in subnodes
					success = success && node.forEachUntilSuccess(function(subNode) {
						return removeChildFoundsets(node, foundsetUUID)
					});
				}
			});
		}
	}

	/**
	 * @param {GroupNode} tree
	 * @param {Array} rowGroupCols
	 * @param {Array} groupKeys
	 * @param {Boolean} [create]
	 *
	 * @return {GroupNode}
	 *
	 * */
	function getTreeNode(tree, rowGroupCols, groupKeys, create) {

		var result = null;

		if (rowGroupCols.length > groupKeys.length + 1) {
			//							$log.warn('discard row groups ' + (rowGroupCols.length - groupKeys.length));
			rowGroupCols = rowGroupCols.slice(0, groupKeys.length + 1);
		}

		/*
		 * {
		 * 	columnId {
		 * 		foundsetUUID: uuid
		 * 		nodes: {
		 * 			keyValue : {
		 * 				foundsetUUID : uuid
		 * 				nodes : {
		 * 					subColumnId { ... }
		 * 				}
		 * 			},
		 * 			keyValue2 : { ... }
		 * 		}
		 * 	  }
		 * }
		 *
		 *
		 * */

		if (!tree || !tree.nodes) {
			return null;
		}

		// the column id e.g. customerid, shipcity
		var columnId = rowGroupCols[0].field;

		// the tree for the given column
		var colTree = tree.nodes[columnId];

		// create the tree node if does not exist
		if (!colTree && create) {
			colTree = new GroupNode(columnId);
			tree.nodes[columnId] = colTree;
		} else if (!colTree) { // or return null
			return null;
		}

		if (rowGroupCols.length === 1) { // the last group

			if (groupKeys.length === 0) { // is a leaf child
				result = colTree;
			} else if (groupKeys.length === 1) { // is a leaf child

				// get the subtree matching the rowGroupCols
				var key = groupKeys[0];
				var keyTree = colTree.nodes[key];

				// create the key tree node if does not exist
				if (!keyTree && create) {
					keyTree = new GroupNode(key);
					colTree.nodes[key] = keyTree;
				} else if (!keyTree) { // or return null
					return null;
				}

				result = keyTree;

			} else { // no group key criteria
				$log.warn("this should not happen");
			}

		} else if (rowGroupCols.length > 1) { // is not the last group
			var key = groupKeys.length ? groupKeys[0] : null;

			if (!colTree) {
				$log.warn("this should not happen")
				return null;
			}

			var subTree = colTree;

			if (key !== null) {
				var keyTree = colTree.nodes[key];

				// create the key tree node if does not exist
				if (!keyTree && create) {
					keyTree = new GroupNode(key);
					colTree.nodes[key] = keyTree;
				} else if (!keyTree) {
					return null;
				}

				subTree = keyTree;

			} else {
				// if is not the last group, should always have a key criteria
				$log.warn("this should not happen")
			}

			rowGroupCols = rowGroupCols.slice(1);
			groupKeys = groupKeys.slice(1);

			result = getTreeNode(subTree, rowGroupCols, groupKeys, create);

		} else {
			$log.warn("No group criteria, should not happen");
		}

		return result;
	}

	/**
	 * @param {GroupNode} tree
	 * @param {String} foundsetUUID
	 * @return {GroupNode}
	 *
	 * */
	function getGroupNodeByFoundsetUUID(tree, foundsetUUID) {
		if (!tree) {
			return null;
		}

		if (!foundsetUUID) {
			return null;
		}

		var resultNode = null;
		tree.forEachUntilSuccess(function(node) {
			if (node.foundsetUUID === foundsetUUID) {
				resultNode = node;
				return true;
			} else if (node.hasNodes()) { // search in subnodes
				return node.forEachUntilSuccess(function(subNode) {
					resultNode = getGroupNodeByFoundsetUUID(node, foundsetUUID);
					if (resultNode) { // if has found the result
						return true;
					} else { // keep searching
						return false;
					}
				});
			} else { // didn't find the node in all it's childs
				return false;
			}
		});
		return resultNode;
	}

	/**
	 * @param {GroupNode} tree
	 * @param {String} foundsetUUID
	 * @return {GroupNode}
	 *
	 * */
	function getParentGroupNode(tree, foundsetUUID) {
		if (!tree) {
			return null;
		}

		if (!foundsetUUID) {
			return null;
		}

		var parentNode = null;
		tree.forEachUntilSuccess(function(node) {
			// found in the child
			if (parentNode) { // already found the tree
				return true;
			}
			if (node.foundsetUUID === foundsetUUID) {
				parentNode = tree;
				return true;
			} else if (node.hasNodes()) { // search in subnodes
				node.forEachUntilSuccess(function(subNode) {
					parentNode = getParentGroupNode(node, foundsetUUID);
					if (parentNode) { // break the for each if has found the result
						return true;
					} else { // keep searching
						return false;
					}
				});
			} else if (parentNode) {
				return true;
			} else { // didn't find the node in all it's childs
				return false;
			}
		});
		return parentNode;
	}

	/**
	 * @param {GroupNode} tree
	 * @param {String} foundsetUUID
	 * @return {Array<GroupNode>}
	 *
	 * @deprecated
	 *
	 * */
	function getTreeNodePath(tree, foundsetUUID) {
		if (!tree) {
			return null;
		}

		if (!foundsetUUID) {
			return null;
		}

		var path = [];

		var resultNode = null;
		tree.forEachUntilSuccess(function(node) {
			if (node.foundsetUUID === foundsetUUID) {
				path.push(node);
				return true;
			} else if (node.hasNodes()) { // search in subnodes
				var isInSubNodes = node.forEachUntilSuccess(function(subNode) {
					var subPath = getTreeNodePath(node, foundsetUUID);
					if (resultNode) { // if has found the result
						return true;
					} else { // keep searching
						return false;
					}
				});

				if (isInSubNodes) {
					path.concat(subPath);
				}

			} else { // didn't find the node in all it's childs
				return false;
			}
		});

		return path;
	}

	// enable testMethods
	/**
	 * @param {String} foundsetUUID
	 * */
	this.getGroupNodeByFoundsetUUID = function(foundsetUUID) {
		return getGroupNodeByFoundsetUUID(rootGroupNode, foundsetUUID);
	};

	/**
	 * @param {String} foundsetUUID
	 * */
	this.getParentGroupNode = function(foundsetUUID) {
		return getParentGroupNode(rootGroupNode, foundsetUUID);
	};

	/**
	 * @param {String} foundsetUUID
	 * @deprecated
	 * */
	this.getTreeNodePath = function(foundsetUUID) {
		return getTreeNodePath(rootGroupNode, foundsetUUID);
	};

}

/**
 * @private
 * @properties={typeid:35,uuid:"306A613F-0C36-4D09-BE8A-DFFDD11EB0DE",variableType:-4}
 */
var $log = {
	debug: function(msg) {
		application.output(msg);
	},
	warn: function(msg) {
		application.output(msg, LOGGINGLEVEL.WARNING);
	},
	error: function(msg) {
		application.output(msg, LOGGINGLEVEL.ERROR);
	}
}

/**
 *
 * @private
 * @param foundsetUUID
 *
 * @properties={typeid:24,uuid:"D5C7AB5A-FBC8-4B00-AAF4-C834A2CC092A"}
 */
function getFoundsetManagerByFoundsetUUID(foundsetUUID) {
	return {
		destroy: function() {
			application.output('Destroy ' + foundsetUUID)
		},
		foundset: {
			viewPort: {
				rows: [],
				size: 0,
				startIndex: 0
			}
		}
	}
}

/**
 * @protected
 * @type {Array}
 *
 * @properties={typeid:35,uuid:"1E8D650F-82AC-4A6B-B87A-F834F1E13A09",variableType:-4}
 */
var rowGroupColsDefault;

/**
 * @properties={typeid:24,uuid:"84E849DE-2EEC-4054-8F77-665906622894"}
 */
function setUp() {
	rowGroupColsDefault = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "customerid",
		id: "customerid"
	}, {
		aggFunc: undefined,
		displayName: "shipcity",
		field: "customerid-shipcity",
		id: "customerid-shipcity"
	}, {
		aggFunc: undefined,
		displayName: "shipcountry",
		field: "customerid-shipcity-shipcountry",
		id: "customerid-shipcity-shipcountry"
	}];
}

/**
 * @protected
 * Return a default cache object pre-populated
 *
 * 0 customerid
 * 		ALFKI
 * 2		shipcity
 * 				Athens
 * 4				shipcountry
 * 						Greece
 * 						Hellas
 * 				Amsterdam
 * 					shipcountry
 * 						Netherlands
 * 						Benelux
 * 		ANTON
 * 			shipcity
 * 				Athens
 * 					shipcountry
 * 						Greece
 * 						Hellas
 * 				Amsterdam
 * 					shipcountry
 * 						Netherlands
 * 						Benelux
 * 		TOMPS
 * 			shipcity
 * 				Athens
 * 					shipcountry
 * 						Greece
 * 						Hellas
 * 				Amsterdam
 * 					shipcountry
 * 						Netherlands
 * 						Benelux
 * *
 * @properties={typeid:24,uuid:"8F7D13BC-DD13-42A6-84B1-F49464C8489C"}
 */
function getTestGroupHashCache() {
	// new object
	var cache = new GroupHashCache();

	cache.setCachedFoundset(rowGroupColsDefault.slice(0, 1), [], 'customerid');
	// ALFKI
	cache.setCachedFoundset(rowGroupColsDefault.slice(0, 1), ['ALFKI'], 'customerid-ALFKI');
	cache.setCachedFoundset(rowGroupColsDefault.slice(0, 2), ['ALFKI'], 'customerid-ALFKI-shipcity');
	cache.setCachedFoundset(rowGroupColsDefault.slice(0, 2), ['ALFKI', 'Athens'], 'customerid-ALFKI-shipcity-Athens');
	// ALFKI - Athens
	cache.setCachedFoundset(rowGroupColsDefault, ['ALFKI', 'Athens'], 'customerid-ALFKI-shipcity-Athens-shipcountry');
	cache.setCachedFoundset(rowGroupColsDefault, ['ALFKI', 'Athens', 'Greece'], 'customerid-ALFKI-shipcity-Athens-shipcountry-Greece');
	cache.setCachedFoundset(rowGroupColsDefault, ['ALFKI', 'Athens', 'Hellas'], 'customerid-ALFKI-shipcity-Athens-shipcountry-Hellas');
	// ALFKI - Amsterdam
	cache.setCachedFoundset(rowGroupColsDefault.slice(0, 2), ['ALFKI', 'Amsterdam'], 'customerid-ALFKI-shipcity-Amsterdam');
	cache.setCachedFoundset(rowGroupColsDefault, ['ALFKI', 'Amsterdam'], 'customerid-ALFKI-shipcity-Amsterdam-shipcountry');
	cache.setCachedFoundset(rowGroupColsDefault, ['ALFKI', 'Amsterdam', 'Netherlands'], 'customerid-ALFKI-shipcity-Amsterdam-shipcountry-Netherlands');
	cache.setCachedFoundset(rowGroupColsDefault, ['ALFKI', 'Amsterdam', 'Benelux'], 'customerid-ALFKI-shipcity-Amsterdam-shipcountry-Benelux');

	// ANTON
	cache.setCachedFoundset(rowGroupColsDefault.slice(0, 1), ['ANTON'], 'customerid-ANTON');
	cache.setCachedFoundset(rowGroupColsDefault.slice(0, 2), ['ANTON'], 'customerid-ANTON-shipcity');
	cache.setCachedFoundset(rowGroupColsDefault.slice(0, 2), ['ANTON', 'Athens'], 'customerid-ANTON-shipcity-Athens');
	// ANTON - Athens
	cache.setCachedFoundset(rowGroupColsDefault, ['ANTON', 'Athens'], 'customerid-ANTON-shipcity-Athens-shipcountry');
	cache.setCachedFoundset(rowGroupColsDefault, ['ANTON', 'Athens', 'Greece'], 'customerid-ANTON-shipcity-Athens-shipcountry-Greece');
	cache.setCachedFoundset(rowGroupColsDefault, ['ANTON', 'Athens', 'Hellas'], 'customerid-ANTON-shipcity-Athens-shipcountry-Hellas');
	// ANTON - Amsterdam
	cache.setCachedFoundset(rowGroupColsDefault.slice(0, 2), ['ANTON', 'Amsterdam'], 'customerid-ANTON-shipcity-Amsterdam');
	cache.setCachedFoundset(rowGroupColsDefault, ['ANTON', 'Amsterdam'], 'customerid-ANTON-shipcity-Amsterdam-shipcountry');
	cache.setCachedFoundset(rowGroupColsDefault, ['ANTON', 'Amsterdam', 'Netherlands'], 'customerid-ANTON-shipcity-Amsterdam-shipcountry-Netherlands');
	cache.setCachedFoundset(rowGroupColsDefault, ['ANTON', 'Amsterdam', 'Benelux'], 'customerid-ANTON-shipcity-Amsterdam-shipcountry-Benelux');

	// TOMPS
	cache.setCachedFoundset(rowGroupColsDefault.slice(0, 1), ['TOMPS'], 'customerid-TOMPS');
	cache.setCachedFoundset(rowGroupColsDefault.slice(0, 2), ['TOMPS'], 'customerid-TOMPS-shipcity');
	cache.setCachedFoundset(rowGroupColsDefault.slice(0, 2), ['TOMPS', 'Athens'], 'customerid-TOMPS-shipcity-Athens');
	// TOMPS - Athens
	cache.setCachedFoundset(rowGroupColsDefault, ['TOMPS', 'Athens'], 'customerid-TOMPS-shipcity-Athens-shipcountry');
	cache.setCachedFoundset(rowGroupColsDefault, ['TOMPS', 'Athens', 'Greece'], 'customerid-TOMPS-shipcity-Athens-shipcountry-Greece');
	cache.setCachedFoundset(rowGroupColsDefault, ['TOMPS', 'Athens', 'Hellas'], 'customerid-TOMPS-shipcity-Athens-shipcountry-Hellas');
	// TOMPS - Amsterdam
	cache.setCachedFoundset(rowGroupColsDefault.slice(0, 2), ['TOMPS', 'Amsterdam'], 'customerid-TOMPS-shipcity-Amsterdam');
	cache.setCachedFoundset(rowGroupColsDefault, ['TOMPS', 'Amsterdam'], 'customerid-TOMPS-shipcity-Amsterdam-shipcountry');
	cache.setCachedFoundset(rowGroupColsDefault, ['TOMPS', 'Amsterdam', 'Netherlands'], 'customerid-TOMPS-shipcity-Amsterdam-shipcountry-Netherlands');
	cache.setCachedFoundset(rowGroupColsDefault, ['TOMPS', 'Amsterdam', 'Benelux'], 'customerid-TOMPS-shipcity-Amsterdam-shipcountry-Benelux');

	return cache;
}

/**
 * @properties={typeid:24,uuid:"83FB9A31-E0F4-47AB-B60A-B2DF504A59FB"}
 */
function test_getCachedFoundset() {

	var cache = getTestGroupHashCache();

	jsunit.assertEquals('customerid', cache.getCachedFoundset(rowGroupColsDefault, []));
	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['ALFKI']));

	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens', cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['ALFKI', 'Athens']));
	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens-shipcountry', cache.getCachedFoundset(rowGroupColsDefault, ['ALFKI', 'Athens']));
	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens-shipcountry-Greece', cache.getCachedFoundset(rowGroupColsDefault, ['ALFKI', 'Athens', 'Greece']));
	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens-shipcountry-Hellas', cache.getCachedFoundset(rowGroupColsDefault, ['ALFKI', 'Athens', 'Hellas']));

	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['ALFKI', 'Amsterdam']));
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam-shipcountry', cache.getCachedFoundset(rowGroupColsDefault, ['ALFKI', 'Amsterdam']));
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam-shipcountry-Netherlands', cache.getCachedFoundset(rowGroupColsDefault, ['ALFKI', 'Amsterdam', 'Netherlands']));
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam-shipcountry-Benelux', cache.getCachedFoundset(rowGroupColsDefault, ['ALFKI', 'Amsterdam', 'Benelux']));

	jsunit.assertEquals('customerid-ANTON-shipcity', cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['ANTON']));

	jsunit.assertEquals('customerid-ANTON-shipcity-Athens', cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['ANTON', 'Athens']));
	jsunit.assertEquals('customerid-ANTON-shipcity-Athens-shipcountry', cache.getCachedFoundset(rowGroupColsDefault, ['ANTON', 'Athens']));
	jsunit.assertEquals('customerid-ANTON-shipcity-Athens-shipcountry-Greece', cache.getCachedFoundset(rowGroupColsDefault, ['ANTON', 'Athens', 'Greece']));
	jsunit.assertEquals('customerid-ANTON-shipcity-Athens-shipcountry-Hellas', cache.getCachedFoundset(rowGroupColsDefault, ['ANTON', 'Athens', 'Hellas']));

	jsunit.assertEquals('customerid-ANTON-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['ANTON', 'Amsterdam']));
	jsunit.assertEquals('customerid-ANTON-shipcity-Amsterdam-shipcountry', cache.getCachedFoundset(rowGroupColsDefault, ['ANTON', 'Amsterdam']));
	jsunit.assertEquals('customerid-ANTON-shipcity-Amsterdam-shipcountry-Netherlands', cache.getCachedFoundset(rowGroupColsDefault, ['ANTON', 'Amsterdam', 'Netherlands']));
	jsunit.assertEquals('customerid-ANTON-shipcity-Amsterdam-shipcountry-Benelux', cache.getCachedFoundset(rowGroupColsDefault, ['ANTON', 'Amsterdam', 'Benelux']));

	jsunit.assertEquals('customerid-TOMPS-shipcity', cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['TOMPS']));

	jsunit.assertEquals('customerid-TOMPS-shipcity-Athens', cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['TOMPS', 'Athens']));
	jsunit.assertEquals('customerid-TOMPS-shipcity-Athens-shipcountry', cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS', 'Athens']));
	jsunit.assertEquals('customerid-TOMPS-shipcity-Athens-shipcountry-Greece', cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS', 'Athens', 'Greece']));
	jsunit.assertEquals('customerid-TOMPS-shipcity-Athens-shipcountry-Hellas', cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS', 'Athens', 'Hellas']));

	jsunit.assertEquals('customerid-TOMPS-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['TOMPS', 'Amsterdam']));
	jsunit.assertEquals('customerid-TOMPS-shipcity-Amsterdam-shipcountry', cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS', 'Amsterdam']));
	jsunit.assertEquals('customerid-TOMPS-shipcity-Amsterdam-shipcountry-Netherlands', cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS', 'Amsterdam', 'Netherlands']));
	jsunit.assertEquals('customerid-TOMPS-shipcity-Amsterdam-shipcountry-Benelux', cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS', 'Amsterdam', 'Benelux']));

}

/**
 * @properties={typeid:24,uuid:"E1CC37C0-6656-4EC8-AB1F-C080A10C1195"}
 */
function test_setCachedFoundset() {
	var groupKeys = [];
	var rowGroupCols = [];

	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "customerid",
		id: "customerid"
	}];

	var cache = new GroupHashCache();

	// top level grouping on customerid
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid');
	jsunit.assertEquals('customerid', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// top level, expand a leaf node
	groupKeys = ["ALFKI"];
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI');
	jsunit.assertEquals('customerid-ALFKI', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// top level, expand a leaf node
	groupKeys = ["ANTON"];
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ANTON');
	jsunit.assertEquals('customerid-ANTON', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI"];
	jsunit.assertEquals('customerid-ALFKI', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// two grouped columns
	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "customerid",
		id: "customerid"
	}, {
		aggFunc: undefined,
		displayName: "shipcity",
		field: "customerid-shipcity",
		id: "customerid-shipcity"
	}];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity');
	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Athens"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Athens');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Amsterdam"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Amsterdam');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// second test

	// two grouped columns
	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "customerid",
		id: "customerid"
	}, {
		aggFunc: undefined,
		displayName: "shipcity",
		field: "customerid-shipcity",
		id: "customerid-shipcity"
	}];

	groupKeys = [];

	// new object
	cache = new GroupHashCache();

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid');
	jsunit.assertEquals('customerid', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity');
	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Athens"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Athens');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Amsterdam"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Amsterdam');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupCols, groupKeys));

	//groupKeys = ["ALFKI"];
	//jsunit.assertEquals('customerid-ALFKI', cache.getCachedFoundset(rowGroupCols, groupKeys));

}

/**
 * @properties={typeid:24,uuid:"4E0D1156-A125-4DD9-8AF4-A2839EAC6E35"}
 */
function test_setCachedFoundsetAtdeepLevel() {
	var groupKeys = [];
	var rowGroupCols = [];

	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "customerid",
		id: "customerid"
	}];

	var cache = new GroupHashCache();

	// top level grouping on customerid
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, null);
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));

	// top level, expand a leaf node
	groupKeys = ["ALFKI"];
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI');
	jsunit.assertEquals('customerid-ALFKI', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// top level, expand a leaf node
	groupKeys = ["ANTON"];
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ANTON');
	jsunit.assertEquals('customerid-ANTON', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI"];
	jsunit.assertEquals('customerid-ALFKI', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// two grouped columns
	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "customerid",
		id: "customerid"
	}, {
		aggFunc: undefined,
		displayName: "shipcity",
		field: "customerid-shipcity",
		id: "customerid-shipcity"
	}];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity');
	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Athens"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Athens');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Amsterdam"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Amsterdam');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// second test

	// two grouped columns
	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "customerid",
		id: "customerid"
	}, {
		aggFunc: undefined,
		displayName: "shipcity",
		field: "customerid-shipcity",
		id: "customerid-shipcity"
	}];

	groupKeys = [];

	// new object
	cache = new GroupHashCache();

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, null);
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity');
	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Athens"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Athens');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Amsterdam"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Amsterdam');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupCols, groupKeys));

	//groupKeys = ["ALFKI"];
	//jsunit.assertEquals('customerid-ALFKI', cache.getCachedFoundset(rowGroupCols, groupKeys));

}

/**
 * @properties={typeid:24,uuid:"DA450281-3F38-4A7B-87C0-6B739CD8A6C9"}
 */
function test_getTreeByFoundsetUUID() {
	var cache = getTestGroupHashCache();

	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid'));
	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-ALFKI-shipcity'));

	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-ALFKI-shipcity-Athens'));
	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-ALFKI-shipcity-Athens-shipcountry'));
	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-ALFKI-shipcity-Athens-shipcountry-Hellas'));
	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-ALFKI-shipcity-Athens-shipcountry-Greece'));

	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-ALFKI-shipcity-Amsterdam'));
	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-ALFKI-shipcity-Amsterdam-shipcountry'));
	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-ALFKI-shipcity-Amsterdam-shipcountry-Netherlands'));
	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-ALFKI-shipcity-Amsterdam-shipcountry-Netherlands'));

	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-ANTON-shipcity'));

	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-ANTON-shipcity-Athens'));
	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-ANTON-shipcity-Athens-shipcountry'));
	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-ANTON-shipcity-Athens-shipcountry-Greece'));
	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-ANTON-shipcity-Athens-shipcountry-Hellas'));

	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-ANTON-shipcity-Amsterdam'));
	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-ANTON-shipcity-Amsterdam-shipcountry'));
	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-ANTON-shipcity-Amsterdam-shipcountry-Netherlands'));
	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-ANTON-shipcity-Amsterdam-shipcountry-Benelux'));

	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-TOMPS-shipcity'));

	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-TOMPS-shipcity-Athens'));
	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-TOMPS-shipcity-Athens-shipcountry'));
	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-TOMPS-shipcity-Athens-shipcountry-Greece'));
	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-TOMPS-shipcity-Athens-shipcountry-Hellas'));

	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-TOMPS-shipcity-Amsterdam'));
	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-TOMPS-shipcity-Amsterdam-shipcountry'));
	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-TOMPS-shipcity-Amsterdam-shipcountry-Netherlands'));
	jsunit.assertNotNull(cache.getGroupNodeByFoundsetUUID('customerid-TOMPS-shipcity-Amsterdam-shipcountry-Benelux'));
}

/**
 * @properties={typeid:24,uuid:"F0C2EE96-0E4F-4A1F-873A-05D56A95C73A"}
 */
function test_getParentTreeNode() {
	var cache = getTestGroupHashCache();

	jsunit.assertEquals('root', cache.getParentGroupNode('customerid').id);
	jsunit.assertEquals('customerid-ALFKI', cache.getParentGroupNode('customerid-ALFKI-shipcity').foundsetUUID);

	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getParentGroupNode('customerid-ALFKI-shipcity-Athens').foundsetUUID);
	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens', cache.getParentGroupNode('customerid-ALFKI-shipcity-Athens-shipcountry').foundsetUUID);
	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens-shipcountry', cache.getParentGroupNode('customerid-ALFKI-shipcity-Athens-shipcountry-Hellas').foundsetUUID);
	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens-shipcountry', cache.getParentGroupNode('customerid-ALFKI-shipcity-Athens-shipcountry-Greece').foundsetUUID);

	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getParentGroupNode('customerid-ALFKI-shipcity-Amsterdam').foundsetUUID);
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getParentGroupNode('customerid-ALFKI-shipcity-Amsterdam-shipcountry').foundsetUUID);
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam-shipcountry', cache.getParentGroupNode('customerid-ALFKI-shipcity-Amsterdam-shipcountry-Netherlands').foundsetUUID);
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam-shipcountry', cache.getParentGroupNode('customerid-ALFKI-shipcity-Amsterdam-shipcountry-Benelux').foundsetUUID);

	jsunit.assertEquals('customerid-ANTON', cache.getParentGroupNode('customerid-ANTON-shipcity').foundsetUUID);

	jsunit.assertEquals('customerid-ANTON-shipcity', cache.getParentGroupNode('customerid-ANTON-shipcity-Athens').foundsetUUID);
	jsunit.assertEquals('customerid-ANTON-shipcity-Athens', cache.getParentGroupNode('customerid-ANTON-shipcity-Athens-shipcountry').foundsetUUID);
	jsunit.assertEquals('customerid-ANTON-shipcity-Athens-shipcountry', cache.getParentGroupNode('customerid-ANTON-shipcity-Athens-shipcountry-Hellas').foundsetUUID);
	jsunit.assertEquals('customerid-ANTON-shipcity-Athens-shipcountry', cache.getParentGroupNode('customerid-ANTON-shipcity-Athens-shipcountry-Greece').foundsetUUID);

	jsunit.assertEquals('customerid-ANTON-shipcity', cache.getParentGroupNode('customerid-ANTON-shipcity-Amsterdam').foundsetUUID);
	jsunit.assertEquals('customerid-ANTON-shipcity-Amsterdam', cache.getParentGroupNode('customerid-ANTON-shipcity-Amsterdam-shipcountry').foundsetUUID);
	jsunit.assertEquals('customerid-ANTON-shipcity-Amsterdam-shipcountry', cache.getParentGroupNode('customerid-ANTON-shipcity-Amsterdam-shipcountry-Netherlands').foundsetUUID);
	jsunit.assertEquals('customerid-ANTON-shipcity-Amsterdam-shipcountry', cache.getParentGroupNode('customerid-ANTON-shipcity-Amsterdam-shipcountry-Benelux').foundsetUUID);

	jsunit.assertEquals('customerid-TOMPS', cache.getParentGroupNode('customerid-TOMPS-shipcity').foundsetUUID);

	jsunit.assertEquals('customerid-TOMPS-shipcity', cache.getParentGroupNode('customerid-TOMPS-shipcity-Athens').foundsetUUID);
	jsunit.assertEquals('customerid-TOMPS-shipcity-Athens', cache.getParentGroupNode('customerid-TOMPS-shipcity-Athens-shipcountry').foundsetUUID);
	jsunit.assertEquals('customerid-TOMPS-shipcity-Athens-shipcountry', cache.getParentGroupNode('customerid-TOMPS-shipcity-Athens-shipcountry-Hellas').foundsetUUID);
	jsunit.assertEquals('customerid-TOMPS-shipcity-Athens-shipcountry', cache.getParentGroupNode('customerid-TOMPS-shipcity-Athens-shipcountry-Greece').foundsetUUID);

	jsunit.assertEquals('customerid-TOMPS-shipcity', cache.getParentGroupNode('customerid-TOMPS-shipcity-Amsterdam').foundsetUUID);
	jsunit.assertEquals('customerid-TOMPS-shipcity-Amsterdam', cache.getParentGroupNode('customerid-TOMPS-shipcity-Amsterdam-shipcountry').foundsetUUID);
	jsunit.assertEquals('customerid-TOMPS-shipcity-Amsterdam-shipcountry', cache.getParentGroupNode('customerid-TOMPS-shipcity-Amsterdam-shipcountry-Netherlands').foundsetUUID);
	jsunit.assertEquals('customerid-TOMPS-shipcity-Amsterdam-shipcountry', cache.getParentGroupNode('customerid-TOMPS-shipcity-Amsterdam-shipcountry-Benelux').foundsetUUID);
}

/**
 * @deprecated
 * @properties={typeid:24,uuid:"0A1234C2-C3D8-4996-833F-2E90C1C6C74A"}
 */
function test_getTreeNodePath() {
	var cache = getTestGroupHashCache();
	var path;

	return;

	path = cache.getTreeNodePath('customerid');

	jsunit.assertEquals(1, path.length);
	jsunit.assertEquals('customerid', path[0].foundsetUUID);

	path = cache.getTreeNodePath('customerid-TOMPS-shipcity-Athens');

	jsunit.assertEquals(3, path.length);
	jsunit.assertEquals('customerid', path[0].foundsetUUID);
	jsunit.assertEquals('customerid-TOMPS-shipcity', path[1].foundsetUUID);
	jsunit.assertEquals('customerid-TOMPS-shipcity-Athens', path[2].foundsetUUID);

	path = cache.getTreeNodePath('customerid-ANTON-shipcity-Athens-shipcountry-Hellas');

	jsunit.assertEquals(5, path.length);
	jsunit.assertEquals('customerid', path[0].foundsetUUID);
	jsunit.assertEquals('customerid-ANTON-shipcity', path[1].foundsetUUID);
	jsunit.assertEquals('customerid-ANTON-shipcity-Athens', path[2].foundsetUUID);
	jsunit.assertEquals('customerid-ANTON-shipcity-Athens-shipcountry', path[3].foundsetUUID);
	jsunit.assertEquals('customerid-ANTON-shipcity-Athens-shipcountry-Hellas', path[4].foundsetUUID);

}

/**
 * @deprecated
 * @properties={typeid:24,uuid:"41DC4FFB-51B6-4268-94FA-29A00AEF16CC"}
 */
function test_updateCachedFoundset() {
	return;
	var groupKeys = [];
	var rowGroupCols = [];

	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "customerid",
		id: "customerid"
	}];

	var cache = new GroupHashCache();

	// top level grouping on customerid
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid');
	jsunit.assertEquals('customerid', cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.updateCachedFoundset(rowGroupCols, groupKeys, 'u-customerid');
	jsunit.assertEquals('u-customerid', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// top level, expand a leaf node
	groupKeys = ["ALFKI"];
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI');
	jsunit.assertEquals('customerid-ALFKI', cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.updateCachedFoundset(rowGroupCols, groupKeys, 'u-customerid-ALFKI');
	jsunit.assertEquals('u-customerid-ALFKI', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// top level, expand a leaf node
	groupKeys = ["ANTON"];
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ANTON');
	jsunit.assertEquals('customerid-ANTON', cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.updateCachedFoundset(rowGroupCols, groupKeys, 'u-customerid-ANTON');
	jsunit.assertEquals('u-customerid-ANTON', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI"];
	jsunit.assertEquals('u-customerid-ALFKI', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// two grouped columns
	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "customerid",
		id: "customerid"
	}, {
		aggFunc: undefined,
		displayName: "shipcity",
		field: "customerid-shipcity",
		id: "customerid-shipcity"
	}];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity');
	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.updateCachedFoundset(rowGroupCols, groupKeys, 'u-customerid-ALFKI-shipcity');
	jsunit.assertEquals('u-customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Athens"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Athens');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens', cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.updateCachedFoundset(rowGroupCols, groupKeys, 'u-customerid-ALFKI-shipcity-Athens');
	jsunit.assertEquals('u-customerid-ALFKI-shipcity-Athens', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Amsterdam"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Amsterdam');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.updateCachedFoundset(rowGroupCols, groupKeys, 'u-customerid-ALFKI-shipcity-Amsterdam');
	jsunit.assertEquals('u-customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupCols, groupKeys));
	// second test

	// two grouped columns
	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "customerid",
		id: "customerid"
	}, {
		aggFunc: undefined,
		displayName: "shipcity",
		field: "customerid-shipcity",
		id: "customerid-shipcity"
	}];

	groupKeys = [];

	// new object
	cache = new GroupHashCache();

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid');
	jsunit.assertEquals('customerid', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity');
	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Athens"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Athens');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Amsterdam"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Amsterdam');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupCols, groupKeys));

	//groupKeys = ["ALFKI"];
	//jsunit.assertEquals('customerid-ALFKI', cache.getCachedFoundset(rowGroupCols, groupKeys));

}

/**
 * @properties={typeid:24,uuid:"708C6906-0C1A-4DB6-8CBE-DFCD2365BEC4"}
 */
function test_removeCachedFoundset() {
	
	cache = getTestGroupHashCache();
	
	jsunit.assertTrue(cache.removeCachedFoundset('customerid-TOMPS-shipcity-Amsterdam')); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS','Amsterdam','Netherlands'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS','Amsterdam','Benelux'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS','Amsterdam'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['TOMPS','Amsterdam'])); // remove id
	jsunit.assertEquals('customerid-TOMPS-shipcity', cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['TOMPS'])); // remove id
	jsunit.assertEquals('customerid-TOMPS-shipcity-Athens', cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['TOMPS', 'Athens'])); // remove id
	
	cache = getTestGroupHashCache();
	
	jsunit.assertTrue(cache.removeCachedFoundset('customerid-ANTON-shipcity-Athens-shipcountry-Greece')); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ANTON','Athens','Greece'])); // remove id
	jsunit.assertEquals('customerid-ANTON-shipcity-Athens-shipcountry-Hellas', cache.getCachedFoundset(rowGroupColsDefault, ['ANTON', 'Athens', 'Hellas'])); // remove id
	jsunit.assertEquals('customerid-ANTON-shipcity-Athens-shipcountry', cache.getCachedFoundset(rowGroupColsDefault, ['ANTON', 'Athens'])); // remove id
	jsunit.assertEquals('customerid-ANTON-shipcity-Athens', cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['ANTON', 'Athens'])); // remove id
	
	var groupKeys = [];
	var rowGroupCols = [];

	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "customerid",
		id: "customerid"
	}];

	var cache = new GroupHashCache();

	// top level grouping on customerid
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid');
	jsunit.assertEquals('customerid', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// top level, expand a leaf node
	groupKeys = ["ALFKI"];
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI');
	jsunit.assertEquals('customerid-ALFKI', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// top level, expand a leaf node
	groupKeys = ["ANTON"];
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ANTON');
	jsunit.assertEquals('customerid-ANTON', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI"];
	jsunit.assertEquals('customerid-ALFKI', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// two grouped columns
	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "customerid",
		id: "customerid"
	}, {
		aggFunc: undefined,
		displayName: "shipcity",
		field: "customerid-shipcity",
		id: "customerid-shipcity"
	}];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity');
	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Athens"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Athens');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens', cache.getCachedFoundset(rowGroupCols, ["ALFKI", "Athens"]));

	groupKeys = ["ALFKI", "Amsterdam"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Amsterdam');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupCols, ["ALFKI", "Amsterdam"]));

	// remove the keys
	jsunit.assertTrue(cache.removeCachedFoundset('customerid-ALFKI-shipcity-Athens')); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupCols, ["ALFKI", "Athens"])); // check id not there
	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupCols, ["ALFKI"])); // check other id still exists
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupCols, ["ALFKI", "Amsterdam"])); // check other id still exists

	// remove the keys
	jsunit.assertTrue(cache.removeCachedFoundset('customerid-ALFKI-shipcity')); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupCols, ["ALFKI", "Athens"])); // check id not there
	jsunit.assertNull(cache.getCachedFoundset(rowGroupCols, ["ALFKI", "Amsterdam"])); // check other id still exists

	// second test

	// two grouped columns
	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "customerid",
		id: "customerid"
	}, {
		aggFunc: undefined,
		displayName: "shipcity",
		field: "customerid-shipcity",
		id: "customerid-shipcity"
	}];

	groupKeys = [];

	// new object
	cache = new GroupHashCache();

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid');
	jsunit.assertEquals('customerid', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity');
	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Athens"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Athens');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Amsterdam"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Amsterdam');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupCols, groupKeys));

	//groupKeys = ["ALFKI"];
	//jsunit.assertEquals('customerid-ALFKI', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// remove the keys
	jsunit.assertTrue(cache.removeCachedFoundset('customerid')); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupCols, ["ALFKI", "Athens"])); // check id not there
	jsunit.assertNull(cache.getCachedFoundset(rowGroupCols, ["ALFKI"])); // check id not there
}

/**
 * @properties={typeid:24,uuid:"D81CB42B-501E-4112-B64C-8BCD3E4C8502"}
 */
function test_removeChildFoundsets() {
	
	cache = getTestGroupHashCache();
	
	jsunit.assertTrue(cache.removeChildFoundset('customerid-TOMPS-shipcity-Amsterdam')); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS','Amsterdam','Netherlands'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS','Amsterdam','Benelux'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS','Amsterdam'])); // remove id
	jsunit.assertNotNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['TOMPS','Amsterdam'])); // remove id
	jsunit.assertEquals('customerid-TOMPS-shipcity', cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['TOMPS'])); // remove id
	jsunit.assertEquals('customerid-TOMPS-shipcity-Athens', cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['TOMPS', 'Athens'])); // remove id
	
	cache = getTestGroupHashCache();
	
	jsunit.assertTrue(cache.removeChildFoundset('customerid-TOMPS-shipcity-Amsterdam-shipcountry')); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS','Amsterdam','Netherlands'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS','Amsterdam','Benelux'])); // remove id
	jsunit.assertNotNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS','Amsterdam'])); // remove id
	jsunit.assertNotNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['TOMPS','Amsterdam'])); // remove id
	jsunit.assertEquals('customerid-TOMPS-shipcity', cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['TOMPS'])); // remove id
	jsunit.assertEquals('customerid-TOMPS-shipcity-Athens', cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['TOMPS', 'Athens'])); // remove id
	
	cache = getTestGroupHashCache();
	
	jsunit.assertTrue(cache.removeChildFoundset('customerid-ANTON-shipcity-Athens-shipcountry-Greece')); // remove id
	jsunit.assertEquals('customerid-ANTON-shipcity-Athens-shipcountry-Greece', cache.getCachedFoundset(rowGroupColsDefault, ['ANTON', 'Athens', 'Greece'])); // remove id
	jsunit.assertEquals('customerid-ANTON-shipcity-Athens-shipcountry-Hellas', cache.getCachedFoundset(rowGroupColsDefault, ['ANTON', 'Athens', 'Hellas'])); // remove id
	jsunit.assertEquals('customerid-ANTON-shipcity-Athens-shipcountry', cache.getCachedFoundset(rowGroupColsDefault, ['ANTON', 'Athens'])); // remove id
	jsunit.assertEquals('customerid-ANTON-shipcity-Athens', cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['ANTON', 'Athens'])); // remove id
	
	
	var groupKeys = [];
	var rowGroupCols = [];

	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "customerid",
		id: "customerid"
	}];

	var cache = new GroupHashCache();

	// top level grouping on customerid
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid');
	jsunit.assertEquals('customerid', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// top level, expand a leaf node
	groupKeys = ["ALFKI"];
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI');
	jsunit.assertEquals('customerid-ALFKI', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// top level, expand a leaf node
	groupKeys = ["ANTON"];
	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ANTON');
	jsunit.assertEquals('customerid-ANTON', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI"];
	jsunit.assertEquals('customerid-ALFKI', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// two grouped columns
	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "customerid",
		id: "customerid"
	}, {
		aggFunc: undefined,
		displayName: "shipcity",
		field: "customerid-shipcity",
		id: "customerid-shipcity"
	}];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity');
	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Athens"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Athens');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Amsterdam"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Amsterdam');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// remove the keys
	//jsunit.assertTrue(cache.removeChildFoundset('customerid-ALFKI-shipcity-Athens')); // remove id
	//jsunit.assertEquals('customerid-ALFKI-shipcity-Athens', cache.getCachedFoundset(rowGroupCols, ["ALFKI", "Athens"])); // check other id still exists
	//jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupCols, ["ALFKI", "Amsterdam"])); // check other id still exists

	// remove the keys
	jsunit.assertTrue(cache.removeChildFoundset('customerid-ALFKI-shipcity')); // remove id
	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupCols, ["ALFKI"])); // check other id still exists
	jsunit.assertEquals(cache.getCachedFoundset(rowGroupCols, ["ALFKI", "Athens"]), null); // check id not there
	jsunit.assertNull(cache.getCachedFoundset(rowGroupCols, ["ALFKI", "Amsterdam"])); // check other id still exists

	// second test

	// two grouped columns
	rowGroupCols = [{
		aggFunc: undefined,
		displayName: "customerid",
		field: "customerid",
		id: "customerid"
	}, {
		aggFunc: undefined,
		displayName: "shipcity",
		field: "customerid-shipcity",
		id: "customerid-shipcity"
	}];

	groupKeys = [];

	// new object
	cache = new GroupHashCache();

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid');
	jsunit.assertEquals('customerid', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI"];
	cache.setCachedFoundset([rowGroupCols[0]], groupKeys, 'customerid-ALFKI');

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity');
	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Athens"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Athens');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens', cache.getCachedFoundset(rowGroupCols, groupKeys));

	groupKeys = ["ALFKI", "Amsterdam"];

	jsunit.assertEquals(null, cache.getCachedFoundset(rowGroupCols, groupKeys));
	cache.setCachedFoundset(rowGroupCols, groupKeys, 'customerid-ALFKI-shipcity-Amsterdam');
	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupCols, groupKeys));

	//groupKeys = ["ALFKI"];
	//jsunit.assertEquals('customerid-ALFKI', cache.getCachedFoundset(rowGroupCols, groupKeys));

	// remove the keys
	jsunit.assertTrue(cache.removeChildFoundset('customerid')); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupCols, ["ALFKI", "Athens"])); // check id not there
	jsunit.assertNull(cache.getCachedFoundset(rowGroupCols, ["ALFKI"])); // check id not there

}

/**
 * @properties={typeid:24,uuid:"0EB7B3A1-0200-482F-B244-EDB3FB1EE17E"}
 */
function test_removeCachedFoundsetAtLevel() {
	
	cache = getTestGroupHashCache();
	application.output('1 ------------------------------------')
	cache.removeCachedFoundsetAtLevel(4)

	jsunit.assertEquals('customerid', cache.getCachedFoundset(rowGroupColsDefault, []));
	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['ALFKI']));

	jsunit.assertEquals('customerid-ALFKI-shipcity-Athens', cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['ALFKI', 'Athens']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ALFKI','Athens'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ALFKI','Athens','Greece'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ALFKI','Athens','Hellas'])); // remove id

	jsunit.assertEquals('customerid-ALFKI-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['ALFKI', 'Amsterdam']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ALFKI','Amsterdam'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ALFKI','Amsterdam','Netherlands'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ALFKI','Amsterdam','Benelux'])); // remove id

	jsunit.assertEquals('customerid-ANTON-shipcity', cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['ANTON']));
	jsunit.assertEquals('customerid-ANTON-shipcity-Athens', cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['ANTON', 'Athens']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ANTON', 'Athens']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ANTON', 'Athens', 'Greece']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ANTON', 'Athens', 'Hellas']));

	jsunit.assertEquals('customerid-ANTON-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['ANTON', 'Amsterdam']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ANTON', 'Amsterdam']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ANTON', 'Amsterdam', 'Netherlands']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ANTON', 'Amsterdam', 'Benelux']));

	jsunit.assertEquals('customerid-TOMPS-shipcity', cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['TOMPS']));

	jsunit.assertEquals('customerid-TOMPS-shipcity-Athens', cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['TOMPS', 'Athens']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS', 'Athens']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS', 'Athens', 'Greece']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS', 'Athens', 'Hellas']));

	jsunit.assertEquals('customerid-TOMPS-shipcity-Amsterdam', cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['TOMPS', 'Amsterdam']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS', 'Amsterdam']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS', 'Amsterdam', 'Netherlands']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS', 'Amsterdam', 'Benelux']));

	
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ANTON','Amsterdam','Netherlands'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ANTON','Amsterdam','Benelux'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ANTON','Amsterdam'])); // remove id
	jsunit.assertNotNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['ANTON','Amsterdam'])); // remove id
	jsunit.assertNotNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['ANTON', 'Athens'])); // remove id
	jsunit.assertEquals('customerid-ANTON-shipcity', cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['ANTON'])); // remove id
	
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS','Amsterdam','Netherlands'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS','Amsterdam','Benelux'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS','Amsterdam'])); // remove id
	jsunit.assertNotNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['TOMPS','Amsterdam'])); // remove id
	jsunit.assertNotNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['TOMPS', 'Athens'])); // remove id
	jsunit.assertEquals('customerid-TOMPS-shipcity', cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['TOMPS'])); // remove id

	
	
	cache = getTestGroupHashCache();
	application.output('2 ------------------------------------')
	cache.removeCachedFoundsetAtLevel(3)
//	jsunit.assertTrue();
//	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ALFKI','Athens','Greece'])); // remove id
//	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ALFKI','Athens','Hellas'])); // remove id
//	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ALFKI','Athens'])); // remove id
//	
//	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ALFKI','Amsterdam','Netherlands'])); // remove id
//	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ALFKI','Amsterdam','Benelux'])); // remove id
//	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ALFKI','Amsterdam'])); // remove id
//	jsunit.assertNotNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['ALFKI','Amsterdam'])); // remove id
//	jsunit.assertNotNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['ALFKI', 'Athens'])); // remove id

	jsunit.assertEquals('customerid', cache.getCachedFoundset(rowGroupColsDefault, []));
	jsunit.assertEquals('customerid-ALFKI-shipcity', cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['ALFKI']));

	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['ALFKI', 'Athens']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ALFKI','Athens'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ALFKI','Athens','Greece'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ALFKI','Athens','Hellas'])); // remove id

	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['ALFKI', 'Amsterdam']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ALFKI','Amsterdam'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ALFKI','Amsterdam','Netherlands'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ALFKI','Amsterdam','Benelux'])); // remove id

	jsunit.assertEquals('customerid-ANTON-shipcity', cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['ANTON']));

	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['ANTON', 'Athens']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ANTON', 'Athens']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ANTON', 'Athens', 'Greece']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ANTON', 'Athens', 'Hellas']));

	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['ANTON', 'Amsterdam']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ANTON', 'Amsterdam']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ANTON', 'Amsterdam', 'Netherlands']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ANTON', 'Amsterdam', 'Benelux']));

	jsunit.assertEquals('customerid-TOMPS-shipcity', cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['TOMPS']));

	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['TOMPS', 'Athens']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS', 'Athens']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS', 'Athens', 'Greece']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS', 'Athens', 'Hellas']));

	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0, 2), ['TOMPS', 'Amsterdam']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS', 'Amsterdam']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS', 'Amsterdam', 'Netherlands']));
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS', 'Amsterdam', 'Benelux']));

	
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ANTON','Amsterdam','Netherlands'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ANTON','Amsterdam','Benelux'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['ANTON','Amsterdam'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['ANTON','Amsterdam'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['ANTON', 'Athens'])); // remove id
	jsunit.assertNotNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['ANTON'])); // remove id
	
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS','Amsterdam','Netherlands'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS','Amsterdam','Benelux'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS','Amsterdam'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['TOMPS','Amsterdam'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['TOMPS', 'Athens'])); // remove id
	jsunit.assertNotNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['TOMPS'])); // remove id

	cache = getTestGroupHashCache();
	
	cache.removeCachedFoundsetAtLevel(2); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS','Amsterdam','Netherlands'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS','Amsterdam','Benelux'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS','Amsterdam'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['TOMPS','Amsterdam'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['TOMPS'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['TOMPS', 'Athens'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['ALFKI'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['ANTON'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['TOMPS'])); // remove id
	jsunit.assertNotNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,1), ['ALFKI'])); // remove id
	jsunit.assertNotNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,1), ['ANTON'])); // remove id
	jsunit.assertNotNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,1), ['TOMPS'])); // remove id
	jsunit.assertNotNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,1), [])); // remove id
	
	
	cache = getTestGroupHashCache();
	
	cache.removeCachedFoundsetAtLevel(1); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS','Amsterdam','Netherlands'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS','Amsterdam','Benelux'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS','Amsterdam'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['TOMPS','Amsterdam'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['TOMPS'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['TOMPS', 'Athens'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['TOMPS'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,1), ['ALFKI'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,1), ['ANTON'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,1), ['TOMPS'])); // remove id
	jsunit.assertNotNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,1), [])); // remove id
	
	cache = getTestGroupHashCache();
	
	cache.removeCachedFoundsetAtLevel(0); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS','Amsterdam','Netherlands'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS','Amsterdam','Benelux'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault, ['TOMPS','Amsterdam'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['TOMPS','Amsterdam'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,2), ['TOMPS'])); // remove id
	jsunit.assertNull(cache.getCachedFoundset(rowGroupColsDefault.slice(0,1), [])); // remove id

}

/*
 *
 select min(orderid) from orders where customerid = 'ALFKI' group by shipcity order by shipcity;

 update orders set shipcountry = 'Greece' where shipcity = 'Athens' or shipcity = 'Thessaloniki';

 select * from orders where customerid = 'ALFKI' order by shipcity ;

 update orders set shipcountry = 'Spain' where shipcity = 'Barcelona' or shipcity = 'Madrid';

 update orders set shipcountry = 'Italy' where shipcity = 'Rome' or shipcity = 'Milan';

 update orders set shipcountry = 'Norway' where shipcity = 'Oslo';

 update orders set shipcountry = 'Netherlands' where shipcity = 'Amsterdam';

 update orders set shipcountry = 'France' where shipcity = 'Paris';

 select * from orders where customerid = 'ALFKI' AND shipcity = 'Madrid'

 */
