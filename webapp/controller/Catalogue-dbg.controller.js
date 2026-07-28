sap.ui.define([
	"com/csr/order/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageBox",
	"com/csr/order/model/formatter"
], function(BaseController, JSONModel, FilterOperator, MessageBox, formatter) {
	"use strict";

	return BaseController.extend("com.csr.order.controller.Catalogue", {

		formatter: formatter,
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf com.csr.order.view.Catalogue
		 */
		onInit: function() {
			var oViewModel = this.createViewModel();
			this.setModel(oViewModel, "catalogueViewModel");
			this.oEventBus = this.getEventBus();
			this.getOwnerComponent().eventBusRegister("component", "refreshProductList", this.updateProductList, this);
			this.getOwnerComponent().eventBusRegister("cartView", "refreshProductList", this.updateProductList, this);
			this.getOwnerComponent().eventBusRegister("OrderShipment", "refreshProductList", this.updateProductList, this);
			this.getOwnerComponent().eventBusRegister("Payment", "refreshProductList", this.updateProductList, this);
		},
		
		createViewModel: function() {
			return new JSONModel({
				"delay": 0,
				"title": "",
				"noDataText": "No Data",
				"discountType": "AUD"
			});
		},
		
		onCatalogueTabSelect: function (oEvent) {
			var catalogueModel = this.getOwnerComponent().getModel("catalogueModel");
			switch (oEvent.getSource().getSelectedKey()) {
				case "Products":
					catalogueModel.setProperty("/isProductListVisible", true);
					catalogueModel.setProperty("/isOrderListVisible", false);
					setTimeout(function() {	//Neo to Cloud Migration Change by FAIR
						this.updateDefaultProductImage();
					});
					
					break;
				case "Orders":
					catalogueModel.setProperty("/isProductListVisible", false);
					catalogueModel.setProperty("/isOrderListVisible", true);
					break;
				default:
			}
		},
		
		/**
		 * Called when a user presses Orders tab in Catalogue screen
		 */
		onOrderPress: function () {
			var oCustomerModel = this.getOwnerComponent().getModel("customerModel");
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			var cashCustomer = oCustomerModel.getProperty("/cashCustomer");
			var customerID;
			if (cashCustomer) {
				customerID = cartHeaderModel.getProperty("/customerID");
			} else {
				customerID = oCustomerModel.getProperty("/referenceCustomer");
			}
			var oCustomerIDFilter = new sap.ui.model.Filter("SoldToPartyID", FilterOperator.EQ, customerID);
			var oOrdersList = this.getView().byId("listOrders");
			var oOrdersTemplate = oOrdersList.getBindingInfo("items").template;
			oOrdersList.bindItems({
				path: "/HeaderSet",
				template: oOrdersTemplate,
				filters: oCustomerIDFilter
			});
		},
		onProductUpdateFinished: function () {
			this.updateDefaultProductImage();
			
		},
		updateDefaultProductImage: function () {
			$('img[id*="product"]').on("error", function () {
				$(this).attr( "src", sap.ui.require.toUrl("com/csr/order") + "/images/csrCompanyLogo.png");
				
			});
		},
		
		/**
		 * Method is used to update list of products based on selected customer
		 */
		updateProductList: function () {
			var oCustomerModel = this.getOwnerComponent().getModel("customerModel");
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			var cashCustomer = oCustomerModel.getProperty("/cashCustomer");
			var customerID;
			if (cashCustomer) {
				customerID = cartHeaderModel.getProperty("/customerID");
			} else {
				customerID = oCustomerModel.getProperty("/referenceCustomer");
			}
			var oCustomerIDFilter = new sap.ui.model.Filter("Kunnr", FilterOperator.EQ, customerID);
			var oProductsList = this.getView().byId("listProducts");
			var oProductsTemplate = oProductsList.getBindingInfo("items").template;
			oProductsList.bindItems({
				path: "/ProductLSet",
				template: oProductsTemplate,
				filters: oCustomerIDFilter
			});
		},
		openCustomerList: function(oEvent) {
			if (!this.customer) {
				this.customer = sap.ui.xmlfragment("cartCustomerSelection","com.csr.order.view.fragment.Customer", this);
				this.getView().addDependent(this.customer);
			}
			this.customer.open();
		},
		closeCustomerPressed: function () {
			if(this.customer){
				this.customer.close();
			}
			this.clearCustomerSearch();
		},
		addCustomerPressed: function () {
			if(this.customer){
				this.customer.close();
			}
			this.clearCustomerSearch();
			var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
			oCrossAppNavigator.toExternal({
				target: {
					shellHash: "#customercreatechange-Display&/create"
				}
			});
		},
		
		onCartQuantityChange: function () {
			this.validateQuantity();
		},
		validateQuantity : function () {
			var oCatalogueViewModel = this.getModel("catalogueViewModel");
			var cartQuantity = oCatalogueViewModel.getProperty("/orderedQty");
			if (cartQuantity <= 0 && !isNaN(parseInt(cartQuantity,10))) {
				oCatalogueViewModel.setProperty("/quantityShowValueStateMessage", true);
				oCatalogueViewModel.setProperty("/quantityValueState", "Error");
				return false;
			} else {
				oCatalogueViewModel.setProperty("/quantityShowValueStateMessage", false);
				oCatalogueViewModel.setProperty("/quantityValueState", "None");
				return true;
			}
		},
		clearCustomerSearch: function() {
			var cartHeaderModel = this.getModel("cartHeaderModel");
			cartHeaderModel.setProperty("/searchVal", "");
			var searchVal = "";
			var customerList = sap.ui.core.Fragment.byId("cartCustomerSelection","customerListId");
			customerList.removeAllItems();
			var customerListItem = sap.ui.core.Fragment.byId("cartCustomerSelection","customerListItem");
			var searchFilter = new sap.ui.model.Filter("Search", FilterOperator.EQ, searchVal);
			customerList.bindItems("/CustomerHeaderSet", customerListItem, null, searchFilter);
		},
		onProductItemPress: function(oEvent) {
			this.selectedProduct = oEvent.getParameter("listItem").getBindingContext().getObject();	
			this.addToCart(oEvent);
			this.productItemEvent = new sap.ui.base.Event(oEvent.getId(), oEvent.getSource(), oEvent.getParameters());
			this.selectedItem = this.getView().byId("listProducts").getSelectedItem();
		},
		addToCart: function(oEvent) {
			if (!this.oPopover) {
				this.oPopover = sap.ui.xmlfragment("com.csr.order.view.fragment.AddProductToCart", this);
				this.getView().addDependent(this.oPopover);
			}
			setTimeout(function() {	//Neo to Cloud Migration Change by FAIR
				this.oPopover.openBy(this.selectedItem);
			});
		},
		addToCartBeforeClose: function() {
			this.productItemEvent.getParameter("listItem").setSelected(false);
			var oCatalogueViewModel = this.getModel("catalogueViewModel");
			oCatalogueViewModel.setProperty("/orderedQty","");
			oCatalogueViewModel.setProperty("/discount","");
			oCatalogueViewModel.setProperty("/discountType","AUD");
		},
		handleAddToCartOK: function() {
			var isQuantityValid = this.validateQuantity();
			if (isQuantityValid) {
				this.oPopover.close();
				this.productItemEvent.getParameter("listItem").setSelected(false);
				this.addProductToCartItems();
			}
		},
		handleAddToCartCancel: function() {
			this.oPopover.close();
			this.productItemEvent.getParameter("listItem").setSelected(false);
		},
		onProductOrderQtySubmit: function () {
			var isQuantityValid = this.validateQuantity();
			if (isQuantityValid) {
				this.oPopover.close();
				this.addProductToCartItems();
			}
		},
		onProductDiscountSubmit: function () {
			var isQuantityValid = this.validateQuantity();
			if (isQuantityValid) {
				this.oPopover.close();
				this.addProductToCartItems();
			}
		},
		addProductToCartItems : function () {
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var oCatalogueViewModel = this.getModel("catalogueViewModel");
			var cartItemSet = cartItemsModel.getProperty("/ItemSet");
			var cartItemsCount = cartItemSet.length;
			var lastItemIndex = cartItemsCount - 1;
			var lastItemMaterialNo = cartItemsModel.getProperty("/ItemSet/" + lastItemIndex + "/materialNo");
			
			if (!lastItemMaterialNo) {
				cartItemsCount = lastItemIndex;
			}
			var item = this.selectedProduct;
			var materialNo = item.Matnr;
			var orderedQuantity = oCatalogueViewModel.getProperty("/orderedQty");
			var materialDesc = item.Description;
			var stockUnit = item.StockUnit;
			var price = item.ArticlePrice;
			var currencyUnit = item.ArticlePriceCurkey;
			var discount = oCatalogueViewModel.getProperty("/discount");
			var discountType = oCatalogueViewModel.getProperty("/discountType");
			var itemCategory = item.ItemCategoryCode;
			var product = {
				"materialNo": materialNo,
				"materialDesc": materialDesc,
				"quantity": orderedQuantity,
				"stockUnit": stockUnit,
				"unitPrice": price,
				"currencyUnit": currencyUnit,
				"discount": discount,
				"discountType": discountType,
				"itemCategory": itemCategory,
				"thirdPartySelected": true,
				"busy": true,
				"isQuantityDisable": true
			};
			cartItemsModel.setProperty("/ItemSet/" + cartItemsCount + "/", product);
			this.updateDeliveryDate("/ItemSet/" + cartItemsCount);
			cartItemsModel.setProperty("/addButtonEnabled", true);
			cartItemsModel.setProperty("/checkoutButtonEnabled", true);
			var arrItemIndex = [cartItemsCount];
			this.oEventBus.publish("catalogueView", "confirmQuantity", {arrItemIndex: arrItemIndex});
		},
		updateDeliveryDate: function (itemPath) {
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var requestedPickUpValueState = cartHeaderModel.getProperty("/requestedPickupDateValueState");
			var requestedDeliveryDateValue = cartHeaderModel.getProperty("/requestedPickupDate");
			var requestPickUpValue = cartHeaderModel.getProperty("/requestPickUpValue");
			if (requestedPickUpValueState === "Error") {
				cartItemsModel.setProperty(itemPath + "/deliveryDate", new Date());
			} else {
				cartItemsModel.setProperty(itemPath + "/deliveryDate", requestedDeliveryDateValue);
				cartItemsModel.setProperty(itemPath + "/deliveryDateInputValue", requestPickUpValue);
			}
		},
		materialIndexInCart: function (materialNo) {
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var itemSet = cartItemsModel.getProperty("/ItemSet");
			var itemCount = itemSet.length;
			var materialIndex = -1;
			for (var itemIndex = 0; itemIndex < itemCount; itemIndex++) {
				var item = itemSet[itemIndex];
				var materialDesc = item.materialDesc;
				if (materialDesc && item.materialNo === materialNo) {
					materialIndex = itemIndex;
					return materialIndex;
				}
			}
			return materialIndex;
			
		},
		onCustomerSelect: function (oEvent) {
			var oCustomerModel = this.getOwnerComponent().getModel("customerModel");
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			var oCustomerPath = oEvent.getSource().getBindingContext().sPath;
			var oCustomer = this.getModel().getProperty(oCustomerPath);
			var customerID = oCustomer.CustomerId;
			var customerFirstName = oCustomer.Firstname;
			var customerLastName = oCustomer.Lastname;
			var customerPaymentTermCode = oCustomer.PaymentTermCode;
			var customerClubGyprock = oCustomer.ZzclubGyprock;
			var customerBillingBlockCode = oCustomer.Billingblockcode;
			var customerDeliveryBlockCode = oCustomer.Deliveryblockcode;
			var customerNotes = oCustomer.Notes;
			
			cartHeaderModel.setProperty("/customerID", customerID);
			cartHeaderModel.setProperty("/firstName", customerFirstName);
			cartHeaderModel.setProperty("/lastName", customerLastName);
			cartHeaderModel.setProperty("/customerPaymentTerm", customerPaymentTermCode);
			cartHeaderModel.setProperty("/customerClubGyprock", customerClubGyprock);
			cartHeaderModel.setProperty("/customerBilling", customerBillingBlockCode);
			cartHeaderModel.setProperty("/customerDelivery", customerDeliveryBlockCode);
			cartHeaderModel.setProperty("/customerNotes", customerNotes);
			cartHeaderModel.setProperty("/email", oCustomer.SmtpAddr);
			
			oCustomerModel.setProperty("/cashCustomer", true);
			this.customer.close();
			this.clearCustomerSearch();
			this.updateProductList();
			this.oEventBus.publish("catalogueView", "refreshShipToValues", {});
		},
		onCustomerSearch : function (oEvent) {
			var searchVal = oEvent.getParameter("query");
			var customerList = sap.ui.core.Fragment.byId("cartCustomerSelection","customerListId");
			customerList.removeAllItems();
			var customerListItem = sap.ui.core.Fragment.byId("cartCustomerSelection","customerListItem");
			var searchFilter = new sap.ui.model.Filter("Search", FilterOperator.EQ, searchVal);
			customerList.bindItems("/CustomerHeaderSet", customerListItem, null, searchFilter);
		},
		onCatalogueSearch: function(oEvent) {
			var catalogueModelData = this.getOwnerComponent().getModel("catalogueModel").getData();
			var searchVal = oEvent.getParameter("query");
			var oCustomerModel = this.getOwnerComponent().getModel("customerModel");
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			var cashCustomer = oCustomerModel.getProperty("/cashCustomer");
			var customerID;
			if (cashCustomer) {
				customerID = cartHeaderModel.getProperty("/customerID");
			} else {
				customerID = oCustomerModel.getProperty("/referenceCustomer");
			}
			var oCustomerIDFilter = new sap.ui.model.Filter("Kunnr", FilterOperator.EQ, customerID);
			var oList;
			var oFilters;
			var template;
			
			if (catalogueModelData.isProductListVisible) {
				var oFilterDescription = new sap.ui.model.Filter("Description", FilterOperator.EQ, searchVal);
				oList = this.getView().byId("listProducts");
				
				if (searchVal) {
					oList.getBinding("items").filter([oFilterDescription]);
				} else {
					template = oList.getBindingInfo("items").template;
					oFilters =  new sap.ui.model.Filter([oCustomerIDFilter], true);
					oList.bindItems({
						path: "/ProductLSet",
						template: template,
						filters: oFilters
					});
				}
			} else if (catalogueModelData.isOrderListVisible) {
				oList = this.getView().byId("listOrders");
				var oFilterSalesOrderNo = new sap.ui.model.Filter("SalesOrderID", FilterOperator.EQ, searchVal);
				
				if (searchVal) {
					oList.getBinding("items").filter([oFilterSalesOrderNo]);
				} else {
					template = oList.getBindingInfo("items").template;
					oCustomerIDFilter = new sap.ui.model.Filter("SoldToPartyID", FilterOperator.EQ, customerID);
					oFilters =  new sap.ui.model.Filter([oCustomerIDFilter], true);
					oList.bindItems({
						path: "/HeaderSet",
						template: template,
						filters: oFilters
					});
				}
			}
		},
		
		onAddToCartOrders: function(oEvent) {
			var oSelOrderData = oEvent.getSource().getBindingContext().getObject();
			var salesOrderID = oSelOrderData.SalesOrderID;
			if (oSelOrderData.SalesOrderTypeCode === "YQT") {
				this.displayQuoteConfirmMessage(salesOrderID);	
			} else {
				this.triggerSalesOrderItemDetails(salesOrderID);
			}
		},
		
		displayQuoteConfirmMessage: function (salesOrderID) {
			var oThis = this;
			var confirmMessage = this.getResourceBundle().getText("copyingQuote");
			MessageBox.confirm(
				confirmMessage, {
					onClose: function(oAction) {
						if (oAction === "OK") {
							oThis.triggerSalesOrderItemDetails(salesOrderID);
						}
					}
				}
			);	
		},

		triggerSalesOrderItemDetails: function(salesOrderID) {
			var oThis = this;
			var oModel = this.getModel();
			oModel.read("/HeaderSet(" + "\'" + salesOrderID + "\')", {
				urlParameters: {
					"$expand": "ItemSet"
				},
				success: function(data) {
					oThis.SalesOrderDetailsSuccessCallback(data);
				},
				error: function (error) {
					oThis.SalesOrderDetailsErrorCallback(error);
				}
			});
		},

		SalesOrderDetailsSuccessCallback: function(data) {
			this.updateSalesOrderItemsInCartModel(data);
		},
		SalesOrderDetailsErrorCallback: function(error) {
			var errorResponse = JSON.parse(error.responseText);
			var errorMessage = errorResponse.error.message.value;
			sap.m.MessageToast.show(
				errorMessage,
				{
					duration: 6000
				});
		},

		updateSalesOrderItemsInCartModel: function(data) {
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			var itemSet = data.ItemSet.results;
			var itemCount = itemSet.length;
			
			var cartItemSet = cartItemsModel.getProperty("/ItemSet");
			var cartItemsCount = cartItemSet.length;
			var lastItemIndex = cartItemsCount - 1;
			var lastItemMaterialNo = cartItemsModel.getProperty("/ItemSet/" + lastItemIndex + "/materialNo");
			if (data.SalesOrderTypeCode === "YQT") {
				cartHeaderModel.setProperty("/customerPO", data.PurchaseOrderNumber);
				cartHeaderModel.setProperty("/VbelnRef", data.SalesOrderID);
				if (data.Zzdpind && data.Zzdpind === "D") {
					cartHeaderModel.setProperty("/shippingMode", "delivery");
					cartHeaderModel.setProperty("/isDelivery", true);
					
				} else {
					cartHeaderModel.setProperty("/shippingMode", "pickup");
					cartHeaderModel.setProperty("/isDelivery", false);
				}
			
				var deliveryPlant = itemSet[0].Plant;
				cartHeaderModel.setProperty("/deliveryPlant", deliveryPlant);
				cartItemsModel.setProperty("/ItemSet" , [{}]);
				cartItemsCount = 0;
			} else if (!lastItemMaterialNo) {
				cartItemsCount = lastItemIndex;
			}
			
			/*if (!lastItemMaterialNo) {
				cartItemsCount = lastItemIndex;
			}
			if (data.SalesOrderTypeCode === "YQT") {
				cartItemsCount = 0;
			}*/
			
			var arrItemIndex = [];
			
			for (var itemIndex = 0; itemIndex < itemCount; itemIndex++) {
				var item = itemSet[itemIndex];

				var materialNo = item.MaterialID;
				var materialDesc = item.ItemDescr;
				var orderedQuantity = item.OrderQty;
				var stockUnit = item.SalesUnit;
				var price = item.NetAmount;
				var currencyUnit = item.DocumentCurrency;
				var itemCategory = item.ItemCategoryCode;
				var itemID;
				var copyInd;
				if (data.SalesOrderTypeCode === "YQT") {
					itemID = item.ItemID;
					copyInd = "X";
				}
				var product = {
					"ItemID": itemID,
					"CopyInd": copyInd,
					"materialNo": materialNo,
					"materialDesc": materialDesc,
					"quantity": orderedQuantity,
					"stockUnit": stockUnit,
					"unitPrice": price,
					"currencyUnit": currencyUnit,
					"discountType": "AUD",
					"itemCategory": itemCategory,
					"thirdPartySelected": true,
					"busy": true,
					"isQuantityDisable": true
				};
				arrItemIndex.push(cartItemsCount);
				cartItemsModel.setProperty("/ItemSet/" + cartItemsCount + "/", product);
				this.updateDeliveryDate("/ItemSet/" + cartItemsCount);
				cartItemsCount++;
			}
			cartItemsModel.setProperty("/addButtonEnabled", true);
			cartItemsModel.setProperty("/checkoutButtonEnabled", true);
			this.oEventBus.publish("catalogueView", "updateDeliveryDetails", {});
			this.oEventBus.publish("catalogueView", "confirmQuantity", {arrItemIndex: arrItemIndex});
		}
	});
});