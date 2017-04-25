angular.module('uigridfilterwsUigridfilterws',['servoy', 'ui.grid', 'ui.grid.moveColumns', 'ui.grid.resizeColumns', 'ui.grid.grouping', 'ui.grid.selection', 'ui.grid.exporter', 'ngAnimate', 'ngTouch']).directive('uigridfilterwsUigridfilterws', function() {  
	 return {
	      restrict: 'E',
	      scope: {
	    	  model: '=svyModel',
	    	  api: "=svyApi",
			  svyServoyapi: '='
	      },
	      controller: function($scope, $element, $http, $attrs, uiGridConstants) {

	    	 		 $scope.highlightFilteredHeader = function( row, rowRenderIndex, col, colRenderIndex ) {
	          		    if( col.filters[0].term ){
	          		      return 'header-filtered';
	          		    } else {
	          		      return '';
	          		    }
	          		  };
	          		  
	          		  $scope.gridOptions = {
	            		    enableSorting: true,
	            		    enableFiltering: true,
	            		    enableColumnResizing: true,
	            		    enableGridMenu: true,
	            		    flatEntityAccess: true,
	            		    fastWatch: true,
	            		    enableSelectAll: true,
						    exporterCsvFilename: 'myFile.csv',
						    exporterPdfDefaultStyle: {fontSize: 9},
						    exporterPdfTableStyle: {margin: [30, 30, 30, 30]},
						    exporterPdfTableHeaderStyle: {fontSize: 10, bold: true, italics: true, color: 'red'},
						    exporterPdfHeader: { text: "My Header", style: 'headerStyle' },
						    exporterPdfFooter: function ( currentPage, pageCount ) {
						      return { text: currentPage.toString() + ' of ' + pageCount.toString(), style: 'footerStyle' };
						    },
						    exporterPdfCustomFormatter: function ( docDefinition ) {
						      docDefinition.styles.headerStyle = { fontSize: 22, bold: true };
						      docDefinition.styles.footerStyle = { fontSize: 10, bold: true };
						      return docDefinition;
						    },
						    exporterPdfOrientation: 'landscape',
						    exporterPdfPageSize: 'LETTER',
						    exporterPdfMaxGridWidth: 700,
						    exporterCsvLinkElement: angular.element(document.querySelectorAll(".custom-csv-link-location")),
	            		    
						    columnDefs: [
						      { name:'Col1', field: 'orderid1', width:150, type:'number'},
						      { name:'Col2', field: 'productid1', width:150},
						      { name:'Col3', field: 'unitprice1', width:150},
						      { name:'Col4', field: 'quantity1', width:150},
						      { name:'Col5', field: 'discount1', width:150},
						      { name:'Col6', field: 'orderid2', width:150},
						      { name:'Col7', field: 'productid2', width:150},
						      { name:'Col8', field: 'unitprice2', width:150},
						      { name:'Col9', field: 'quantity2', width:150},
						      { name:'Col10', field: 'discount2', width:150},
						      { name:'Col11', field: 'orderid3', width:150},
						      { name:'Col12', field: 'productid3', width:150},
						      { name:'Col13', field: 'unitprice3', width:150},
						      { name:'Col14', field: 'quantity3', width:150},
						      { name:'Col15', field: 'discount3', width:150},
						      { name:'Col16', field: 'orderid4', width:150},
						      { name:'Col17', field: 'productid4', width:150},
						      { name:'Col18', field: 'unitprice4', width:150},
						      { name:'Col19', field: 'quantity4', width:150},
						      { name:'Col20', field: 'discount4', width:150}
						    ],
							onRegisterApi: function( gridApi ) {
	            		      $scope.grid1Api = gridApi;
	            	    	  $scope.grid1Api.treeBase.expandAll = true;
	            		    }
	            		  };
	            	  
	               	
	            	  $scope.toggleFiltering = function(){
	            			    $scope.gridOptions.enableFiltering = !$scope.gridOptions.enableFiltering;
	            			    $scope.grid1Api.core.notifyDataChange( uiGridConstants.dataChange.COLUMN );
	            	  };
	            	  
	            	  $scope.toggleGroupExpanding = function(){
	            		  $scope.grid1Api.treeBase.expandAll ? $scope.grid1Api.treeBase.expandAllRows(): $scope.grid1Api.treeBase.collapseAllRows();
	            		  $scope.grid1Api.treeBase.expandAll = !$scope.grid1Api.treeBase.expandAll;

	            	  };
	            	  
	            	  $scope.clearGrouping = function() {
	            		  
	            		  $scope.grid1Api.grouping.clearGrouping();
	            	  }
	            	  $http.get('/servoy-service/rest_ws/servoy_sample_rest_ws/ws_order_details')
					    .success(function(data) {
					      $scope.gridOptions.data = data;
					      console.log(data);
					    });
	            	  
      },
      templateUrl: 'uigridfilterws/uigridfilterws/uigridfilterws.html'
    };
  })