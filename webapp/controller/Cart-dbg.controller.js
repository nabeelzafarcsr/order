/*Change History
 ***********************************************************************
 * Date         Incident      Author      Description
 * --------    -----------  ---------    ------------------
 *19/01/2018   607288/2018   I327900     ePOS screen freeze
 *28/03/2018   152478/2018   C5267849    ePOS extra blank line in Order App 
 *04/13/2018   187458/2018   C5253525    Stop the focus moving to the items
 *1/6/2018     274868/2018   C5253525    ePOS order entry screen - duplicated payment
 *14/11/2022   801719/2022   I561959     Handle product substitution
 ***********************************************************************
 */

sap.ui.define([
	"com/csr/order/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageBox",
	"com/csr/order/model/formatter",
	"com/csr/order/util/OrderServiceUtil"
], function(BaseController, JSONModel, FilterOperator, MessageBox, formatter, OrderServiceUtil) {
	"use strict";

	return BaseController.extend("com.csr.order.controller.Cart", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf com.csr.order.view.CartLayout
		 */
		formatter: formatter,
		OrderServiceUtil: OrderServiceUtil,
		onInit: function() {
			var oViewModel = this.createViewModel();
			var today = new Date();
			var quoteEndDate = new Date();
			var minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
			quoteEndDate.setDate(quoteEndDate.getDate() + 90);
			this.getView().setModel(oViewModel, "cartViewModel");
			this.getOwnerComponent().getModel("cartItemsModel").setProperty("/ItemSet/0/deliveryDateInputValue", formatter.getDateInputValueString(
				today));
			this.getOwnerComponent().getModel("cartItemsModel").setProperty("/ItemSet/0/deliveryDate", today);
			this.getOwnerComponent().getModel("cartItemsModel").setProperty("/ItemSet/0/discountType", "%");
			this.oEventBus = this.getEventBus();
			this.getOwnerComponent().eventBusRegister("component", "refreshShipToValues", this.refreshShipToValues, this);
			this.getOwnerComponent().eventBusRegister("OrderShipment", "refreshShipToValues", this.refreshShipToValues, this);
			this.getOwnerComponent().eventBusRegister("Payment", "refreshShipToValues", this.refreshShipToValues, this);
			this.getOwnerComponent().eventBusRegister("catalogueView", "updateDeliveryDetails", this.updateDeliveryDetails, this);
			this.getOwnerComponent().eventBusRegister("catalogueView", "confirmQuantity", this.confirmedQuantity, this);
			this.getOwnerComponent().eventBusRegister("catalogueView", "updatePaymentTerm", this.updatePaymentTerm, this);
			this.getOwnerComponent().eventBusRegister("home", "hideMaster", this.hideMaster, this);
			this.getOwnerComponent().getModel("cartHeaderModel").setProperty("/requestedPickupDate", today);
			this.getOwnerComponent().getModel("cartHeaderModel").setProperty("/requestPickUpValue", formatter.getDateInputValueString(today));

			var CreditBlock = "";
			this.getOwnerComponent().getModel("cartHeaderModel").setProperty("/CreditBlock", CreditBlock);
			this.getOwnerComponent().getModel("cartHeaderModel").setProperty("/minDate", minDate);
			this.getOwnerComponent().getModel("cartHeaderModel").setProperty("/quoteStartDate", today);
			this.getOwnerComponent().getModel("cartHeaderModel").setProperty("/quoteEndDate", quoteEndDate);
			this.getOwnerComponent().getModel("cartHeaderModel").setProperty("/quoteEndDateInputValue", formatter.getDateInputValueString(
				quoteEndDate));
			this.arrItemIndex = [];
		},

		onAfterRendering: function() {
			var oThis = this;
			var defaultShippingMode = this.getView().byId("segBtnDefaultShippingMode");
			var pickUpMode = this.getView().byId("segBtnPickup");
			var deliveryMode = this.getView().byId("segBtnDelivery");
			defaultShippingMode.setTooltip(this.getResourceBundle().getText("pickup"));
			pickUpMode.setTooltip(this.getResourceBundle().getText("pickup"));
			deliveryMode.setTooltip(this.getResourceBundle().getText("delivery"));

			sap.ui.Device.orientation.attachHandler(function(event) {
				oThis.handleOrientationChanges();
			});
			if (sap.ui.Device.orientation.portrait) {
				sap.m.MessageBox.show(this.getResourceBundle().getText("orientationMsg"), sap.m.MessageBox.Icon.INFORMATION);
			}
		},
		handleOrientationChanges: function() {
			if (sap.ui.Device.orientation.portrait) {
				sap.m.MessageBox.show(this.getResourceBundle().getText("orientationMsg"), sap.m.MessageBox.Icon.INFORMATION);
			} else {
				this.hideMaster();
			}
		},
		hideMaster: function() {
			var deviceModel = this.getOwnerComponent().getModel("device");
			var isDesktop = deviceModel.getProperty("/system/desktop");
			var isLandscape = deviceModel.getProperty("/orientation/landscape");
			var cartViewModel = this.getView().getModel("cartViewModel");
			var posSplitAppModel = this.getOwnerComponent().getModel("posSplitApp");
			var currentTooltip = cartViewModel.getProperty("/tooltip");

			if (!isDesktop && isLandscape) {
				if (currentTooltip === "Full Screen") {
					cartViewModel.setProperty("/icon", "sap-icon://exit-full-screen");
					cartViewModel.setProperty("/tooltip", "Exit Full Screen");
					posSplitAppModel.setProperty("/mode", "HideMode");
				}
			}

		},
		createViewModel: function() {
			return new JSONModel({
				"delay": 0,
				"busy": false,
				"icon": "sap-icon://full-screen",
				"tooltip": "Full Screen",
				"orderHeader": {},
				"showValueStateMessage": {},
				"valueState": {},
				"valueStateText": {}
			});
		},
		openCustomerList: function(oEvent) {
			if (!this.customer) {
				this.customer = sap.ui.xmlfragment("cartCustomerSelection", "com.csr.order.view.fragment.Customer", this);
				this.getView().addDependent(this.customer);
			}
			this.customer.open();
		},
		closeCustomerPressed: function() {
			if (this.customer) {
				this.customer.close();
			}
			this.clearCustomerSearch();
		},
		addCustomerPressed: function() {
			if (this.customer) {
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
		onCustomerSelect: function(oEvent) {
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
			cartHeaderModel.setProperty("/businessName", oCustomer.Businessname);
			cartHeaderModel.setProperty("/purchaseOrderRequired", oCustomer.Katr1);
			cartHeaderModel.setProperty("/lastName", customerLastName);
			cartHeaderModel.setProperty("/customerPaymentTerm", customerPaymentTermCode);
			cartHeaderModel.setProperty("/customerClubGyprock", customerClubGyprock);
			cartHeaderModel.setProperty("/customerBilling", customerBillingBlockCode);
			cartHeaderModel.setProperty("/customerDelivery", customerDeliveryBlockCode);
			cartHeaderModel.setProperty("/customerNotes", customerNotes);
			cartHeaderModel.setProperty("/email", oCustomer.SmtpAddr);
			cartHeaderModel.setProperty("/shipTo", customerID);
			cartHeaderModel.setProperty("/CreditBlock", oCustomer.CreditBlock);
			//Start of changes C5253525 274868/2018/ePOS order entry screen-duplicated payment
			var checkOutBtnId = this.getView().byId("checkoutBtn");
			if (oCustomer.CreditBlock === true) {
				checkOutBtnId.setText("Credit Blocked");
			} else {
				var orderType = cartHeaderModel.getProperty("/orderType");
				if (orderType === "YQT") {
					checkOutBtnId.setText(this.getResourceBundle().getText("quoteCheckOutText"));
				}
				checkOutBtnId.setText(this.getResourceBundle().getText("checkout"));
			}
			//End of changes C5253525 274868/2018/ePOS order entry screen-duplicated payment
			oCustomerModel.setProperty("/cashCustomer", true);
			this.customer.close();
			this.clearCustomerSearch();
			this.oEventBus.publish("cartView", "refreshProductList", {});
			this.refreshShipToValues();
			this.clearOrderHeaderDetails();
			//	this.onAddItem();//Commented by C5253525 187458/2018/Stop the focus moving to the items
		},
		clearOrderHeaderDetails: function() {
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			var oViewModel = this.getView().getModel("cartViewModel");
			var orderHeaderInitialData = {
				"smsSelected": true
			};
			orderHeaderModel.setData(orderHeaderInitialData);
			oViewModel.setProperty("/showValueStateMessage/customerPO", false);
			oViewModel.setProperty("/valueState/customerPO", "None");
		},
		onCustomerSearch: function(oEvent) {
			var searchVal = oEvent.getParameter("query");
			var customerList = sap.ui.core.Fragment.byId("cartCustomerSelection", "customerListId");
			customerList.removeAllItems();
			var customerListItem = sap.ui.core.Fragment.byId("cartCustomerSelection", "customerListItem");
			var searchFilter = new sap.ui.model.Filter("Search", FilterOperator.EQ, searchVal);
			customerList.bindItems("/CustomerHeaderSet", customerListItem, null, searchFilter);
		},
		clearCustomerSearch: function() {
			var cartHeaderModel = this.getModel("cartHeaderModel");
			cartHeaderModel.setProperty("/searchVal", "");
			var searchVal = "";
			var customerList = sap.ui.core.Fragment.byId("cartCustomerSelection", "customerListId");
			customerList.removeAllItems();
			var customerListItem = sap.ui.core.Fragment.byId("cartCustomerSelection", "customerListItem");
			var searchFilter = new sap.ui.model.Filter("Search", FilterOperator.EQ, searchVal);
			customerList.bindItems("/CustomerHeaderSet", customerListItem, null, searchFilter);
		},
		onShipToChange: function() {
			var oViewModel = this.getView().getModel("cartViewModel");
			this.clearOrderHeaderDetails();
			var isCartEmpty = this.isCartEmpty();
			if (!isCartEmpty) {
				oViewModel.setProperty("/busy", true);
				this.triggerOrderSimulate(false);
			}
		},
		onDiscountTypeChange: function(oEvent) {
			this.handleEnterKeyPress(oEvent);
		},
		onUnitOfMeasureChange: function(oEvent) {
			this.handleEnterKeyPress(oEvent);
		},
		onMaterialSubmit: function(oEvent) {
			this.handleEnterKeyPress(oEvent);
		},
		onQuantitySubmit: function(oEvent) {
			this.handleEnterKeyPress(oEvent);
		},
		onDiscountSubmit: function(oEvent) {
			this.handleEnterKeyPress(oEvent);
		},
		onMaterialDescSubmit: function(oEvent) {
			this.handleEnterKeyPress(oEvent);
		},
		onSalesUnitSubmit: function(oEvent) {
			this.handleEnterKeyPress(oEvent);
		},
		handleEnterKeyPress: function(oEvent) {
			var oThis = this;
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			var oItemBindingContext = oEvent.getSource().getParent().getBindingContext("cartItemsModel");
			var itemsPath = oItemBindingContext.sPath;
			this.selectedItemPath = itemsPath;
			var cartItem = cartItemsModel.getProperty(itemsPath);
			var materialNo = cartItem.materialNo;
			var materialDesc = cartItem.materialDesc;
			var deliveryPlant = cartHeaderModel.getProperty("/deliveryPlant");
			cartItemsModel.setProperty(itemsPath + "/isQuantityDisable", true);
			var index = itemsPath.split("/")[2];

			if (this.arrItemIndex.indexOf(index) === -1) {
				this.arrItemIndex.push(index);
			}
			this.currentIndex = this.arrItemIndex.indexOf(index);
			if (materialDesc) {
				// Pass the index here
				this.onAddItem(this.arrItemIndex);
			} else if (materialNo) {
				var oFilters = [];
				var oModel = this.getModel();
				var oPlantFilter = new sap.ui.model.Filter("Werks", FilterOperator.EQ, deliveryPlant);
				var oFilterDescription = new sap.ui.model.Filter("SearchText", FilterOperator.EQ, materialNo);
				oFilters.push(oPlantFilter);
				oFilters.push(oFilterDescription);

				oModel.read("/ProductLSet", {
					filters: oFilters,
					success: function(data) {
						oThis.onGetProductSuccessCallback(data);
					},
					error: function() {
						oThis.arrItemIndex.splice(this.currentIndex, 1);
						cartItemsModel.setProperty(itemsPath + "/isQuantityDisable", false);
						oThis.onGetProductErrorCallback();
					}
				});
			} else {
				this.arrItemIndex.splice(this.currentIndex, 1);
				cartItemsModel.setProperty(itemsPath + "/isQuantityDisable", false);
				sap.m.MessageToast.show(
					this.getResourceBundle().getText("addItems"), {
						duration: 6000
					});
			}
		},
		onGetProductSuccessCallback: function(data) {
			this.addItemToCart(data);
		},
		onGetProductErrorCallback: function() {
			sap.m.MessageToast.show(
				this.getResourceBundle().getText("unableToFetchProduct"), {
					duration: 6000
				});
		},
		addItemToCart: function(data) {
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			if (data.results && data.results.length === 1) {
				var item = data.results[0];
				var materialNo = item.Matnr;
				var qunatity = cartItemsModel.getProperty(this.selectedItemPath + "/quantity");
				if (!qunatity) {
					qunatity = "1";
				}
				var materialDesc = item.Description;
				var stockUnit = item.StockUnit; 
				var price = item.ArticlePrice;
				var currencyUnit = item.ArticlePriceCurkey;
				var discount = cartItemsModel.getProperty(this.selectedItemPath + "/discount");
				var discountType = cartItemsModel.getProperty(this.selectedItemPath + "/discountType");

				var product = {
					"materialNo": materialNo,
					"materialDesc": materialDesc,
					"stockUnit": stockUnit,
					"unitPrice": price,
					"quantity": qunatity,
					"currencyUnit": currencyUnit,
					"discount": discount,
					"discountType": discountType,
					"thirdPartySelected": true
				};
				cartItemsModel.setProperty(this.selectedItemPath, product);
				cartItemsModel.setProperty(this.selectedItemPath + "/busy", true);
				this.updateDeliveryDate(this.selectedItemPath);
				var index = this.selectedItemPath.split("/")[2];
				if (this.arrItemIndex.indexOf(index) === -1) {
					this.arrItemIndex.push(index);
				}

				// Pass the index here
				this.onAddItem(this.arrItemIndex);
			} else if (data.results && data.results.length > 1) {
				this.arrItemIndex.splice(this.currentIndex, 1);
				cartItemsModel.setProperty(this.selectedItemPath + "/isQuantityDisable", false);
				sap.m.MessageToast.show(
					this.getResourceBundle().getText("unableToFetchCartItem"), {
						duration: 6000
					});
			} else {
				this.arrItemIndex.splice(this.currentIndex, 1);
				cartItemsModel.setProperty(this.selectedItemPath + "/isQuantityDisable", false);

				sap.m.MessageToast.show(
					this.getResourceBundle().getText("noProducts"), {
						duration: 6000
					});
			}
		},
		materialIndexInCart: function(materialNo) {
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

		onToggleScreen: function() {
			var cartViewModel = this.getView().getModel("cartViewModel");
			var posSplitAppModel = this.getOwnerComponent().getModel("posSplitApp");
			var currentTooltip = cartViewModel.getProperty("/tooltip");
			if (currentTooltip === "Full Screen") {
				cartViewModel.setProperty("/icon", "sap-icon://exit-full-screen");
				cartViewModel.setProperty("/tooltip", "Exit Full Screen");
				posSplitAppModel.setProperty("/mode", "HideMode");
			} else {
				cartViewModel.setProperty("/icon", "sap-icon://full-screen");
				cartViewModel.setProperty("/tooltip", "Full Screen");
				posSplitAppModel.setProperty("/mode", "StretchCompressMode");
			}
		},
		onItemPress: function(oEvent) {
			var oViewModel = this.getView().getModel("cartViewModel");
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var oListItem = oEvent.getParameter("listItem");
			var oCtx = oListItem.getBindingContext("cartItemsModel");
			if (oCtx) {
				this._flushCartRowInputsToModel(oListItem, oCtx.getPath(), cartItemsModel);
			}
			var itemContextPath = oListItem.getBindingContextPath();
			var materialDesc = cartItemsModel.getProperty(itemContextPath + "/materialDesc");
			var itemIndex;
			var oParameter;
			if (materialDesc) {
				oViewModel.setProperty("/busy", true);
				itemIndex = itemContextPath.substring(itemContextPath.lastIndexOf("/") + 1, itemContextPath.length);
				oParameter = {
					"itemIndex": itemIndex,
					"context": "cart"
				};
				this.getOwnerComponent().getRouter().navTo("OrderScheduleLines", oParameter, true);
				oViewModel.setProperty("/busy", false);
			}
		},
		onPickup: function() {
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			cartHeaderModel.setProperty("/isDelivery", false);
			cartHeaderModel.setProperty("/shippingMode", "pickup");
			var deliveryPlant = cartHeaderModel.getProperty("/deliveryPlant");
			this.updateTimeSlot(deliveryPlant);
			this.clearTATPStatus();
		},
		onCheckTATPStatus: function() {
			var oViewModel = this.getView().getModel("cartViewModel");
			oViewModel.setProperty("/busy", true);
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			var requestedDeliveryDateValue = cartHeaderModel.getProperty("/requestedPickupDate");
			var timeSlot = cartHeaderModel.getProperty("/timeSlot");
			var vechicleType = cartHeaderModel.getProperty("/vechicleType");
			var deliverPlant = cartHeaderModel.getProperty("/deliveryPlant");
			var shippingMode = cartHeaderModel.getProperty("/shippingMode");
			var formattedDeliveryDate = this.formatter.formatTATPDate(requestedDeliveryDateValue);
			var urlParamters;
			if (shippingMode === "pickup") {
				urlParamters = {
					"SalesOrderID": "",
					"TSLOT": timeSlot,
					"VDATU": formattedDeliveryDate,
					"VHTYP": "",
					"VSTEL": deliverPlant,
					"ZZRQTYP": "P"
				};
			} else {
				urlParamters = {
					"SalesOrderID": "",
					"TSLOT": timeSlot,
					"VDATU": formattedDeliveryDate,
					"VHTYP": vechicleType,
					"VSTEL": deliverPlant,
					"ZZRQTYP": "D"
				};
			}

			var oModel = this.getModel();

			oModel.callFunction(
				"/CheckTATP", {
					method: "GET",
					urlParameters: urlParamters,
					success: function(data) {
						oViewModel.setProperty("/busy", false);
						cartHeaderModel.setProperty("/tatpStatus", data.TatpOk);
					},
					error: function(error) {
						oViewModel.setProperty("/busy", false);
						var errorResponse = JSON.parse(error.responseText);
						var errorMessage = errorResponse.error.message.value;
						sap.m.MessageToast.show(
							errorMessage, {
								duration: 6000
							});
					}
				}
			);

		},
		onDelivery: function() {
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			cartHeaderModel.setProperty("/isDelivery", true);
			cartHeaderModel.setProperty("/shippingMode", "delivery");
			var deliveryPlant = cartHeaderModel.getProperty("/deliveryPlant");
			this.updateTimeSlot(deliveryPlant);
			this.updateVechicleTypes(deliveryPlant);
			this.clearTATPStatus();
			this.resetDelvieryFields();     //C5267297 - 112289- Deltype
		},
		
		//C5267297 - 112289- Deltype 
		resetDelvieryFields:function(){
			var delTypeList = this.byId(sap.ui.core.Fragment.createId("deliveryDetails", "dlvType"));
			var timeSlotList = this.byId(sap.ui.core.Fragment.createId("deliveryDetails", "timeSlot"));
			var vechicleTypeList = this.byId(sap.ui.core.Fragment.createId("deliveryDetails", "vechicleType"));
			delTypeList.clearSelection();
			timeSlotList.clearSelection();
			vechicleTypeList.clearSelection();
			delTypeList.setSelectedIndex(0);
			timeSlotList.setSelectedIndex(0);
			vechicleTypeList.setSelectedIndex(0);
			this.getOwnerComponent().getModel("cartHeaderModel").refresh(true);
		},

		updateTimeSlot: function(deliveryPlant) {
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			var shippingMode = cartHeaderModel.getProperty("/shippingMode");
			var timeSlotList = this.byId(sap.ui.core.Fragment.createId("deliveryDetails", "timeSlot"));
			var oPropertyFilter = new sap.ui.model.Filter("PropertyName", FilterOperator.EQ, "Tslot");
			var oEntityTypeFilter = new sap.ui.model.Filter("EntityType", FilterOperator.EQ, "TATP");
			var oKeyFilter = new sap.ui.model.Filter("Key", FilterOperator.EQ, deliveryPlant);
			var oSearchTextFilter;
			var template = new sap.ui.core.Item({
				key: "{Key}",
				text: "{Value}"
			});
		//	cartHeaderModel.setProperty("/timeSlot", "");           //  C5267297 - 112289 - 06/03/2019
			if (shippingMode === "pickup") {
				oSearchTextFilter = new sap.ui.model.Filter("Searchtext", FilterOperator.EQ, "P");
			} else {
				oSearchTextFilter = new sap.ui.model.Filter("Searchtext", FilterOperator.EQ, "D");
			}
			var oFilters = new sap.ui.model.Filter([oPropertyFilter, oEntityTypeFilter, oKeyFilter, oSearchTextFilter], true);
			timeSlotList.bindItems({
				path: "/GetGenericF4Set",
				template: template,
				filters: oFilters
			});
		},
		updateVechicleTypes: function(deliveryPlant) {
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			var vechicleTypeList = this.byId(sap.ui.core.Fragment.createId("deliveryDetails", "vechicleType"));
			var oPropertyFilter = new sap.ui.model.Filter("PropertyName", FilterOperator.EQ, "Vhtyp");
			var oEntityTypeFilter = new sap.ui.model.Filter("EntityType", FilterOperator.EQ, "TATP");
			var oKeyFilter = new sap.ui.model.Filter("Key", FilterOperator.EQ, deliveryPlant);
			var template = new sap.ui.core.Item({
				key: "{Key}",
				text: "{Value}"
			});
			var oFilters = new sap.ui.model.Filter([oPropertyFilter, oEntityTypeFilter, oKeyFilter], true);
		//	cartHeaderModel.setProperty("/vechicleType", "");        //  C5267297 - 112289 - 06/03/2019
			vechicleTypeList.bindItems({
				path: "/GetGenericF4Set",
				template: template,
				filters: oFilters
			});
		},
		onDeliveryTypeChange: function() {
			this.clearTATPStatus();
		},
		onTimeSlotChange: function() {
			this.clearTATPStatus();
		},
		onVechicleTypeChange: function() {
			this.clearTATPStatus();
		},
		clearTATPStatus: function() {
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			cartHeaderModel.setProperty("/tatpStatus", "");
		},
		onShippingTabSelect: function(oEvent) {
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			switch (oEvent.getSource().getSelectedKey()) {
				case "pickup":
					cartHeaderModel.setProperty("/isDelivery", false);
					break;
				case "delivery":
					cartHeaderModel.setProperty("/isDelivery", true);
					break;
				default:
			}
		},

		updateDeliveryDetails: function() {
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			var deliveryPlant = cartHeaderModel.getProperty("/deliveryPlant");
			this.updateTimeSlot(deliveryPlant);
			this.updateVechicleTypes(deliveryPlant);
			this.clearTATPStatus();
		},
		confirmedQuantity: function(sChannel, oEvent, oData) {
			var arrItemIndex = oData.arrItemIndex;
			this.arrItemIndex = this.arrItemIndex.concat(arrItemIndex);
			this.onAddItem(this.arrItemIndex);
		},
		onAddNewItem: function() {
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var cartItemLength = cartItemsModel.getProperty("/ItemSet").length;
			var cartItem = this.createEmptyItem();
			cartItemsModel.setProperty("/ItemSet/" + cartItemLength, cartItem);
		},
		onAddItem: function(arrIndex) {
			var oViewModel = this.getView().getModel("cartViewModel");
			//oViewModel.setProperty("/busy", true);
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			var isDeliveryPlantExist = this.isDeliveryPlantExist();
			var isCartValid = this.validateCart();
			var isCartEmpty = this.isCartEmpty();
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var cartItemLength = cartItemsModel.getProperty("/ItemSet").length;
			var lastCartItemIndex = cartItemLength - 1;

			if (isCartValid && isDeliveryPlantExist) {
				if (!isCartEmpty) {
					var item = cartItemsModel.getProperty("/ItemSet/" + lastCartItemIndex);
					//if (item.materialNo) {							//commented by C5267849 Incident- 152478 / 2018 / ePOS extra blank line in Order App*/
					if (item.materialNo && item.materialDesc) { //added by C5267849 Incident- 152478 / 2018 / ePOS extra blank line in Order App*/
						var cartItem = this.createEmptyItem();
						cartItemsModel.setProperty("/ItemSet/" + cartItemLength, cartItem);
					}
					this.triggerOrderSimulate(false, arrIndex);
					orderHeaderModel.setProperty("/newItem", true);
				} else {
					oViewModel.setProperty("/busy", false);
				}
			} else {
				sap.m.MessageToast.show(
					this.getResourceBundle().getText("mandatoryFieldsCheck"), {
						duration: 6000
					});
				oViewModel.setProperty("/busy", false);
			}
		},

		isDeliveryPlantExist: function() {
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			var cartViewModel = this.getView().getModel("cartViewModel");
			var deliveryPlant = cartHeaderModel.getProperty("/deliveryPlant");

			if (deliveryPlant) {
				return true;
			} else {
				cartViewModel.setProperty("/showValueStateMessage/deliveryPlant", true);
				cartViewModel.setProperty("/valueState/deliveryPlant", "Error");
				return false;
			}
		},

		validateCartQuantity: function() {
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var cartItems = cartItemsModel.getProperty("/ItemSet");
			var cartItemCount = cartItems.length;

			for (var cartIndex = 0; cartIndex < cartItemCount; cartIndex++) {
				var cartItem = cartItems[cartIndex];
				var cartQuantity = cartItem.quantity;
				if (cartQuantity <= 0 && !isNaN(parseInt(cartQuantity, 10))) {
					cartItemsModel.setProperty("/ItemSet/" + cartIndex + "/quantityShowValueStateMessage", true);
					cartItemsModel.setProperty("/ItemSet/" + cartIndex + "/quantityValueState", "Error");
					return false;
				} else {
					cartItemsModel.setProperty("/ItemSet/" + cartIndex + "/quantityShowValueStateMessage", false);
					cartItemsModel.setProperty("/ItemSet/" + cartIndex + "/quantityValueState", "None");
				}
			}
			return true;
		},
		validateCart: function() {
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var cartItems = cartItemsModel.getProperty("/ItemSet");
			var cartItemCount = cartItems.length;
			var isQuantityValid = true;
			var isDateValid = true;

			for (var cartIndex = 0; cartIndex < cartItemCount; cartIndex++) {
				var cartItem = cartItems[cartIndex];
				var materiaDesc = cartItem.materialDesc;
				var cartQuantity = cartItem.quantity;
				var cartDeliveryDateValue = cartItem.deliveryDateInputValue;
				var cartDeliveryDate = cartItem.deliveryDate;
				if (materiaDesc) {
					if (cartQuantity <= 0 && !isNaN(parseInt(cartQuantity, 10))) {
						isQuantityValid = false;
						cartItemsModel.setProperty("/ItemSet/" + cartIndex + "/quantityShowValueStateMessage", true);
						cartItemsModel.setProperty("/ItemSet/" + cartIndex + "/quantityValueState", "Error");
					} else {
						cartItemsModel.setProperty("/ItemSet/" + cartIndex + "/quantityShowValueStateMessage", false);
						cartItemsModel.setProperty("/ItemSet/" + cartIndex + "/quantityValueState", "None");
					}
					if (!this.validateDate(cartDeliveryDateValue, cartDeliveryDate)) {
						isDateValid = false;
						cartItemsModel.setProperty("/ItemSet/" + cartIndex + "/deliveryDateShowValueStateMessage", true);
						cartItemsModel.setProperty("/ItemSet/" + cartIndex + "/deliveryDateValueState", "Error");
					} else {
						cartItemsModel.setProperty("/ItemSet/" + cartIndex + "/deliveryDateShowValueStateMessage", false);
						cartItemsModel.setProperty("/ItemSet/" + cartIndex + "/deliveryDateValueState", "None");
					}
				}
			}
			if (isDateValid && isQuantityValid) {
				return true;
			}
			return false;
		},
		validateCartLineItemAmount: function() {
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var cartItems = cartItemsModel.getProperty("/ItemSet");
			var cartItemCount = cartItems.length;
			var isCartAmountValid = true;

			for (var cartIndex = 0; cartIndex < cartItemCount; cartIndex++) {
				var cartItem = cartItems[cartIndex];
				var materiaDesc = cartItem.materialDesc;
				var cartAmount = cartItem.kzwi2;
				if (materiaDesc) {
					if (!(cartItem.itemCategory === "YAOS" || cartItem.itemCategory === "YQOS") && cartAmount <= 0) {
						isCartAmountValid = false;
					}
				}
			}
			if (isCartAmountValid) {
				return true;
			}
			return false;
		},

		onMaterialSearch: function(oEvent) {
			var serchText = oEvent.getParameter("query");
			var listControl = oEvent.getSource().getParent().getParent().getContent();
			var binding = listControl[1].getBinding("items");
			var oFilters = null;
			var materialFilter = new sap.ui.model.Filter("Description", FilterOperator.EQ, serchText);
			oFilters = new sap.ui.model.Filter([materialFilter]);
			binding.aFilters = [];
			binding.filter(oFilters, "Application");
		},

		onMaterialValueHelpTapped: function(oEvent) {
			var userInput = oEvent.getSource().getValue();
			if (!this.materialValueHelp) {
				this.materialValueHelp = sap.ui.xmlfragment("cartMaterialSearch", "com.csr.order.view.fragment.MaterialValueHelp", this);
				this.getView().addDependent(this.materialValueHelp);
			}
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
			var materialList = sap.ui.core.Fragment.byId("cartMaterialSearch", "materialListId");
			materialList.removeAllItems();
			var materialListItem = sap.ui.core.Fragment.byId("cartMaterialSearch", "materialListItem");
			var oProductSearchFilter = new sap.ui.model.Filter("Description", "EQ", userInput);
			var oFilters = new sap.ui.model.Filter([oProductSearchFilter, oCustomerIDFilter], true);

			materialList.bindItems("/ProductLSet", materialListItem, null, oFilters);
			this.materialValueHelp.open();
		},

		onMaterialSelect: function(oEvent) {
			var oMaterialPath = oEvent.getSource().getBindingContext().sPath;
			var oMaterial = this.getModel().getProperty(oMaterialPath);
			this.updateCartItemsModel(oMaterial);
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			//cartItemsModel.setProperty("/addButtonEnabled", false);
			cartItemsModel.setProperty("/checkoutButtonEnabled", true);
			this.materialValueHelp.close();
		},

		closeMaterialValueHelp: function() {
			if (this.materialValueHelp) {
				this.materialValueHelp.close();
			}
		},
		updateCartItemsModel: function(oMaterial) {
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var cartItems = cartItemsModel.getProperty("/ItemSet");
			var itemsCount = cartItems.length;
			var lastItemIndex = itemsCount - 1;
			var qunatity = cartItemsModel.getProperty("/ItemSet/" + lastItemIndex + "/quantity");
			if (!qunatity) {
				qunatity = "1";
			}
			if (oMaterial) {
				cartItemsModel.setProperty("/ItemSet/" + lastItemIndex + "/materialNo", oMaterial.Matnr);
				cartItemsModel.setProperty("/ItemSet/" + lastItemIndex + "/materialDesc", oMaterial.Description);
				cartItemsModel.setProperty("/ItemSet/" + lastItemIndex + "/stockUnit", oMaterial.StockUnit);
				cartItemsModel.setProperty("/ItemSet/" + lastItemIndex + "/stockQuantity", oMaterial.StockQuantity);
				cartItemsModel.setProperty("/ItemSet/" + lastItemIndex + "/unitPrice", oMaterial.ArticlePrice);
				cartItemsModel.setProperty("/ItemSet/" + lastItemIndex + "/currencyUnit", oMaterial.ArticlePriceCurkey);
				cartItemsModel.setProperty("/ItemSet/" + lastItemIndex + "/quantity", qunatity);
				cartItemsModel.setProperty("/ItemSet/" + lastItemIndex + "/busy", true);
				cartItemsModel.setProperty("/ItemSet/" + lastItemIndex + "/isQuantityDisable", true);
				this.arrItemIndex.push(lastItemIndex);
				this.onAddItem(this.arrItemIndex);
			}
		},
		updateTotalItemCount: function() {
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var itemsCount = this.OrderServiceUtil.getCartCount.apply(this);
			cartItemsModel.setProperty("/totalItemCount", itemsCount);
		},
		onItemDelete: function(oEvent) {
			var oItemBindingContext = oEvent.getSource().getParent().getBindingContext("cartItemsModel");
			var itemsPath = oItemBindingContext.sPath;
			var itemLength = itemsPath.length;
			var itemIndex = itemsPath.substring(itemsPath.lastIndexOf("/") + 1, itemLength);
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var cartItems = cartItemsModel.getProperty("/ItemSet");
			var cartItemsCount = cartItems.length;

			var confirmMessage = this.getResourceBundle().getText("deletingCartItem");
			var oThis = this;
			MessageBox.confirm(
				confirmMessage, {
					onClose: function(oAction) {
						if (oAction === "OK") {
							cartItems.splice(parseInt(itemIndex, 10), 1);
							if (cartItemsCount === 1) {
								var cartItem = oThis.createEmptyItem();
								cartItems.push(cartItem);
							}
							cartItemsModel.setProperty("/ItemSet", cartItems);
							oThis.updateProductValue();
							oThis.updateTotalItemCount();
						}
					}
				}
			);
		},
		refreshShipToValues: function() {
			var oCustomerModel = this.getOwnerComponent().getModel("customerModel");
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			var cashCustomer = oCustomerModel.getProperty("/cashCustomer");
			var customerID;
			if (cashCustomer) {
				customerID = cartHeaderModel.getProperty("/customerID");
			} else {
				customerID = oCustomerModel.getProperty("/referenceCustomer");
			}
			var oCustomerIDFilter = new sap.ui.model.Filter("Searchtext", FilterOperator.EQ, customerID);
			var oPropertyFilter = new sap.ui.model.Filter("PropertyName", FilterOperator.EQ, "ShipToParty");
			var oEntityTypeFilter = new sap.ui.model.Filter("EntityType", FilterOperator.EQ, "Header");
			var oShipToList = this.getView().byId("shipToList");
			var template = new sap.ui.core.Item({
				key: "{Key}",
				text: "{Value}"
			});
			var oFilters = new sap.ui.model.Filter([oCustomerIDFilter, oPropertyFilter, oEntityTypeFilter], true);
			oShipToList.bindItems({
				path: "/GetGenericF4Set",
				template: template,
				filters: oFilters
			});
		},
		updatePaymentTerm: function() {},
		onPaymentTermSelect: function(oEvent) {

		},
		onOrderTypeChange: function() {
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			/*Start of Changes by C5253525 Incident- 293642 / 2017 / Cannot save quotation on iPad*/
			var orderType = cartHeaderModel.getProperty("/orderType");
			if (orderType === "YQT") {
				this.triggerOrderSimulate(false);
			}
			/*End of hanges by C5253525 Incident- 293642 / 2017 / Cannot save quotation on iPad*/
			cartHeaderModel.setProperty("/isDelivery", false);
			cartHeaderModel.setProperty("/shippingMode", "pickup");
			var deliveryPlant = cartHeaderModel.getProperty("/deliveryPlant");

			if (orderType === "YOR1") {
				var itemSet = this.getOwnerComponent().getModel("cartItemsModel").getProperty("/ItemSet");
				var itemCount = itemSet.length;
				for (var itemIndex = 0; itemIndex < itemCount; itemIndex++) {
					this.getOwnerComponent().getModel("cartItemsModel").setProperty("/ItemSet/" + itemIndex + "/thirdPartySelected", true);
				}
			}
			if (orderType === "YOR1" || orderType === "YOR" || orderType === "YQT") {
				this.updateTimeSlot(deliveryPlant);
			}
			this.clearTATPStatus();
		},
		validateDeliveryPlant: function(oEvent) {
			var path = oEvent.getSource().getBindingPath("selectedKey");
			var showValueStatePath = oEvent.getSource().getBindingPath("showValueStateMessage");
			var valueStatePath = oEvent.getSource().getBindingPath("valueState");
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			var oViewModel = this.getView().getModel("cartViewModel");
			if (cartHeaderModel.getProperty(path)) {
				oViewModel.setProperty(showValueStatePath, false);
				oViewModel.setProperty(valueStatePath, "None");
				return true;
			} else {
				oViewModel.setProperty(showValueStatePath, true);
				oViewModel.setProperty(valueStatePath, "Error");
				return false;
			}
		},
		onDeliveryPlantChange: function(oEvent) {
			var isValidDeliveryPlant = this.validateDeliveryPlant(oEvent);
			var oViewModel = this.getView().getModel("cartViewModel");
			if (isValidDeliveryPlant) {
				this.clearOrderHeaderDetails();
				var isCartEmpty = this.isCartEmpty();
				if (!isCartEmpty) {
					oViewModel.setProperty("/busy", true);
					this.triggerOrderSimulate(false);
				}
				this.updateDeliveryDetails();
				this.resetDelvieryFields();     //C5267297 - 112289- Deltype
			}
		},
		onDeliveryPlantSelect: function(oEvent) {

		},

		isCartEmpty: function() {
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var itemSet = cartItemsModel.getProperty("/ItemSet");
			var itemCount = itemSet.length;
			/*for (var itemIndex = 0; itemIndex < itemCount; itemIndex++) {
				var item = itemSet[itemIndex];
				if (item.materialDesc) {
					return false;
				}
			}
			return true;*/
			return false;
		},
		validatePaymentTerm: function(oEvent) {
			var path = oEvent.getSource().getBindingPath("selectedKey");
			var enteredValue = oEvent.getParameter("value");
			var showValueStatePath = oEvent.getSource().getBindingPath("showValueStateMessage");
			var valueStatePath = oEvent.getSource().getBindingPath("valueState");
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			var oViewModel = this.getView().getModel("cartViewModel");
			var selectedKey = cartHeaderModel.getProperty(path);
			if ((selectedKey === "" && enteredValue === "") || selectedKey) {
				oViewModel.setProperty(showValueStatePath, false);
				oViewModel.setProperty(valueStatePath, "None");
				return true;
			} else {
				oViewModel.setProperty(showValueStatePath, true);
				oViewModel.setProperty(valueStatePath, "Error");
				return false;
			}
		},
		onChangeRequestPickupDate: function() {
			var oViewModel = this.getView().getModel("cartViewModel");
			var isCartEmpty;
			var isRequestPickupDateValid = this.validateRequestPickupDate();
			this.clearTATPStatus();
			if (isRequestPickupDateValid) {
				this.updateDateInCartModel();
				isCartEmpty = this.isCartEmpty();
				if (!isCartEmpty) {
					oViewModel.setProperty("/busy", true);
					this.triggerOrderSimulate(false);
				}
			}
		},
		updateDateInCartModel: function() {
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var cartItems = cartItemsModel.getProperty("/ItemSet");
			var cartItemCount = cartItems.length;

			for (var cartIndex = 0; cartIndex < cartItemCount; cartIndex++) {
				this.updateDeliveryDate("/ItemSet/" + cartIndex);
			}
		},
		validateRequestPickupDate: function() {
			var oViewModel = this.getView().getModel("cartViewModel");
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			var requestPickupDateValue = cartHeaderModel.getProperty("/requestedPickupDate");
			var requestPickInputValue = cartHeaderModel.getProperty("/requestPickUpValue");

			if (this.validateDate(requestPickInputValue, requestPickupDateValue)) {
				cartHeaderModel.setProperty("/showValueStateMessage/requestedPickupDate", false);
				cartHeaderModel.setProperty("/requestedPickupDateValueState", "None");
				return true;
			} else {
				oViewModel.setProperty("/valueStateText/requestedPickupDate", this.getResourceBundle().getText("invalidRequestPickupDate"));
				cartHeaderModel.setProperty("/requestedPickupDateShowValueStateMessage", true);
				cartHeaderModel.setProperty("/requestedPickupDateValueState", "Error");
				return false;
			}
		},
		validateQuoteStartDate: function() {
			var oViewModel = this.getView().getModel("cartViewModel");
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			var quoteStartDateValue = cartHeaderModel.getProperty("/quoteStartDate");
			var todaysDate = new Date();
			var quoteStartDate = new Date(quoteStartDateValue);

			if (quoteStartDate.getFullYear() < todaysDate.getFullYear() ||
				(quoteStartDate.getFullYear() === todaysDate.getFullYear() &&
					quoteStartDate.getMonth() < todaysDate.getMonth()) ||
				(quoteStartDate.getFullYear() === todaysDate.getFullYear() &&
					quoteStartDate.getMonth() === todaysDate.getMonth() &&
					quoteStartDate.getDate() < todaysDate.getDate())) {
				oViewModel.setProperty("/valueStateText/quoteStartDate", this.getResourceBundle().getText("invalidQuoteStartDate"));
				oViewModel.setProperty("/showValueStateMessage/quoteStartDate", true);
				oViewModel.setProperty("/valueState/quoteStartDate", "Error");
				return;
			} else {
				var quoteEndDateValue = cartHeaderModel.getProperty("/quoteEndDate");
				var quoteEndDate = new Date(quoteEndDateValue);

				if (quoteEndDate.getFullYear() < quoteStartDate.getFullYear() ||
					(quoteEndDate.getFullYear() === quoteStartDate.getFullYear() &&
						quoteEndDate.getMonth() < quoteStartDate.getMonth()) ||
					(quoteEndDate.getFullYear() === quoteStartDate.getFullYear() &&
						quoteEndDate.getMonth() === quoteStartDate.getMonth() &&
						quoteEndDate.getDate() < quoteStartDate.getDate())) {
					oViewModel.setProperty("/valueStateText/quoteStartDate", this.getResourceBundle().getText("invlaidQuoteStartDateEndDate"));
					oViewModel.setProperty("/showValueStateMessage/quoteStartDate", true);
					oViewModel.setProperty("/valueState/quoteStartDate", "Error");
					return;
				} else {
					if (quoteStartDate.getFullYear() > quoteEndDate.getFullYear() ||
						(quoteStartDate.getFullYear() === quoteEndDate.getFullYear() &&
							quoteStartDate.getMonth() > quoteEndDate.getMonth()) ||
						(quoteStartDate.getFullYear() === quoteEndDate.getFullYear() &&
							quoteStartDate.getMonth() === quoteEndDate.getMonth() &&
							quoteStartDate.getDate() > quoteEndDate.getDate())) {
						oViewModel.setProperty("/valueStateText/quoteEndDate", this.getResourceBundle().getText("invlaidQuoteEndDateStartDate"));
						oViewModel.setProperty("/showValueStateMessage/quoteEndDate", true);
						oViewModel.setProperty("/valueState/quoteEndDate", "Error");
						return;
					} else {
						oViewModel.setProperty("/showValueStateMessage/quoteEndDate", false);
						oViewModel.setProperty("/valueState/quoteEndDate", "None");
					}
					oViewModel.setProperty("/showValueStateMessage/quoteStartDate", false);
					oViewModel.setProperty("/valueState/quoteStartDate", "None");
				}
			}
		},
		validateQuoteEndDate: function() {
			var oViewModel = this.getView().getModel("cartViewModel");
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			var quoteEndDateValue = cartHeaderModel.getProperty("/quoteEndDate");
			var quoteEndDateInputValue = cartHeaderModel.getProperty("/quoteEndDateInputValue");
			var todaysDate = new Date();
			var quoteEndDate = new Date(quoteEndDateValue);

			if (quoteEndDate.getFullYear() < todaysDate.getFullYear() ||
				(quoteEndDate.getFullYear() === todaysDate.getFullYear() && quoteEndDate.getMonth() < todaysDate.getMonth()) ||
				(quoteEndDate.getFullYear() === todaysDate.getFullYear() && quoteEndDate.getMonth() === todaysDate.getMonth() && quoteEndDate.getDate() <
					todaysDate.getDate()) || !this.validateDate(quoteEndDateInputValue, quoteEndDateValue)) {
				oViewModel.setProperty("/valueStateText/quoteEndDate", this.getResourceBundle().getText("invalidQuoteEndDate"));
				oViewModel.setProperty("/showValueStateMessage/quoteEndDate", true);
				oViewModel.setProperty("/valueState/quoteEndDate", "Error");
				return;
			} else {

				var quoteStartDateValue = cartHeaderModel.getProperty("/quoteStartDate");
				var quoteStartDate = new Date(quoteStartDateValue);

				if (quoteStartDate.getFullYear() > quoteEndDate.getFullYear() ||
					(quoteStartDate.getFullYear() === quoteEndDate.getFullYear() &&
						quoteStartDate.getMonth() > quoteEndDate.getMonth()) ||
					(quoteStartDate.getFullYear() === quoteEndDate.getFullYear() &&
						quoteStartDate.getMonth() === quoteEndDate.getMonth() &&
						quoteStartDate.getDate() > quoteEndDate.getDate())) {
					oViewModel.setProperty("/valueStateText/quoteEndDate", this.getResourceBundle().getText("invlaidQuoteEndDateStartDate"));
					oViewModel.setProperty("/showValueStateMessage/quoteEndDate", true);
					oViewModel.setProperty("/valueState/quoteEndDate", "Error");
					return;
				} else {
					if (quoteEndDate.getFullYear() < quoteStartDate.getFullYear() ||
						(quoteEndDate.getFullYear() === quoteStartDate.getFullYear() &&
							quoteEndDate.getMonth() < quoteStartDate.getMonth()) ||
						(quoteEndDate.getFullYear() === quoteStartDate.getFullYear() &&
							quoteEndDate.getMonth() === quoteStartDate.getMonth() &&
							quoteEndDate.getDate() < quoteStartDate.getDate())) {

						oViewModel.setProperty("/valueStateText/quoteStartDate", this.getResourceBundle().getText("invlaidQuoteStartDateEndDate"));
						oViewModel.setProperty("/showValueStateMessage/quoteStartDate", true);
						oViewModel.setProperty("/valueState/quoteStartDate", "Error");
						return;
					} else {
						oViewModel.setProperty("/showValueStateMessage/quoteStartDate", false);
						oViewModel.setProperty("/valueState/quoteStartDate", "None");
					}

					oViewModel.setProperty("/showValueStateMessage/quoteEndDate", false);
					oViewModel.setProperty("/valueState/quoteEndDate", "None");
				}
			}
		},
		validateWithTodayDate: function(dateValue) {
			var todaysDate = new Date();
			if (dateValue.getFullYear() < todaysDate.getFullYear() ||
				(dateValue.getFullYear() === todaysDate.getFullYear() && dateValue.getMonth() < todaysDate.getMonth()) ||
				(dateValue.getFullYear() === todaysDate.getFullYear() && dateValue.getMonth() === todaysDate.getMonth() && dateValue.getDate() <
					todaysDate.getDate())) {
				return false;
			}
			return true;
		},
		validateDate: function(dateInput, dateValue) {
			var datePat = /^(\d{1,2})(\/|-)(\d{1,2})\2(\d{2}|\d{4})$/;
			var matchArray = dateInput.match(datePat);
			var result = true;
			var year;
			var month;
			var day;

			if (matchArray === null) {
				return false;
			} else {
				year = parseInt(matchArray[4], 10);
				if (year.toString().length === 4) {
					day = parseInt(matchArray[1], 10); //matchArray[1];
					month = parseInt(matchArray[3], 10); //matchArray[3];
					dateValue = new Date(year, month - 1, day);
				} else {
					day = dateValue.getDate();
					month = dateValue.getMonth() + 1;
					year = dateValue.getFullYear();
				}
				result = this.validateWithTodayDate(dateValue);
				if (!result) {
					return false;
				}
				this.validateMonthYearDay();
			}
			return result;
		},
		validateMonthYearDay: function(month, year, day) {
			if ((month < 1 || month > 12) || (day < 1 || day > 31) ||
				((month === 4 || month === 6 || month === 9 || month === 11) && day === 31)) {
				return false;
			}
			if (month === 2) {
				var isleap = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0));
				if (day > 29 || (day === 29 && !isleap)) {
					return false;
				}
			}
		},
		validateCustomerPO: function() {
			var oViewModel = this.getView().getModel("cartViewModel");
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			var customerPONo = cartHeaderModel.getProperty("/customerPO");
			var customerPORequired = cartHeaderModel.getProperty("/purchaseOrderRequired");

			if (customerPORequired === "Y" && customerPONo) {
				oViewModel.setProperty("/showValueStateMessage/customerPO", false);
				oViewModel.setProperty("/valueState/customerPO", "None");
				return true;
			} else if (customerPORequired === "Y" && !customerPONo) {
				oViewModel.setProperty("/valueStateText/customerPO", this.getResourceBundle().getText("invalidCustomerPO"));
				oViewModel.setProperty("/showValueStateMessage/customerPO", true);
				oViewModel.setProperty("/valueState/customerPO", "Error");
				return false;
			} else {
				oViewModel.setProperty("/showValueStateMessage/customerPO", false);
				oViewModel.setProperty("/valueState/customerPO", "None");
				return true;
			}
		},
		onQuantityChange: function(oEvent) {
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var cartItemPath = oEvent.getSource().getParent().getBindingContext("cartItemsModel").sPath;
			var cartQuantity = cartItemsModel.getProperty(cartItemPath + "/quantity");
			cartItemsModel.setProperty(cartItemPath + "/confirmedQuantity", "");
			var index = cartItemPath.split("/")[2];

			if (cartQuantity <= 0 && !isNaN(parseInt(cartQuantity, 10))) {
				cartItemsModel.setProperty(cartItemPath + "/quantityShowValueStateMessage", true);
				cartItemsModel.setProperty(cartItemPath + "/quantityValueState", "Error");
				return false;
			} else {
				cartItemsModel.setProperty(cartItemPath + "/quantityShowValueStateMessage", false);
				cartItemsModel.setProperty(cartItemPath + "/quantityValueState", "None");

				cartItemsModel.setProperty("/addButtonEnabled", true);
				if (this.arrItemIndex.indexOf(index) === -1) {
					this.arrItemIndex.push(index);
				}

				return true;
			}

		},
		onDiscountChange: function(oEvent) {
			var cartItemPath = oEvent.getSource().getParent().getBindingContext("cartItemsModel").sPath;
			var index = cartItemPath.split("/")[2];
			if (this.arrItemIndex.indexOf(index) === -1) {
				this.arrItemIndex.push(index);
			}

		},
		onDeliveryDateChange: function(oEvent) {
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var cartItemPath = oEvent.getSource().getParent().getBindingContext("cartItemsModel").sPath;
			var deliveryDate = cartItemsModel.getProperty(cartItemPath + "/deliveryDate");
			var deliveryDateValue = cartItemsModel.getProperty(cartItemPath + "/deliveryDateInputValue");
			var index = cartItemPath.split("/")[2];

			if (!this.validateDate(deliveryDateValue, deliveryDate)) {
				cartItemsModel.setProperty(cartItemPath + "/deliveryDateShowValueStateMessage", true);
				cartItemsModel.setProperty(cartItemPath + "/deliveryDateValueState", "Error");
				return false;
			} else {
				cartItemsModel.setProperty(cartItemPath + "/deliveryDateShowValueStateMessage", false);
				cartItemsModel.setProperty(cartItemPath + "/deliveryDateValueState", "None");
				if (this.arrItemIndex.indexOf(index) === -1) {
					this.arrItemIndex.push(index);
				}
				cartItemsModel.setProperty("/addButtonEnabled", true);
				return true;
			}
		},
		updateProductValue: function() {
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var itemSet = cartItemsModel.getProperty("/ItemSet");
			var itemCount = itemSet.length;
			var productValue = 0;
			for (var itemIndex = 0; itemIndex < itemCount; itemIndex++) {
				var item = itemSet[itemIndex];
				var itemTotalAmount = item.kzwi2;
				if (itemTotalAmount) {
					itemTotalAmount = parseFloat(itemTotalAmount);
				} else {
					itemTotalAmount = 0;
				}

				if (itemTotalAmount) {
					productValue += itemTotalAmount;
				}

			}
			productValue = parseFloat(productValue).toLocaleString(undefined, {
				minimumFractionDigits: 2
			});
			cartHeaderModel.setProperty("/productValue", productValue);
		},
		updateDeliveryDate: function(itemPath) {
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

		_flushCartRowInputsToModel: function(oListItem, sItemPath, cartItemsModel) {
			if (!cartItemsModel) {
				cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			}
			var aCells = oListItem.getCells();
			if (!aCells || !aCells.length) {
				return;
			}
			var oFirstCell = aCells[0];
			var aInputs = [];
			var fnCollectInputs = function(oCtrl) {
				if (!oCtrl) {
					return;
				}
				if (oCtrl.getMetadata && oCtrl.getMetadata().getName() === "sap.m.Input") {
					aInputs.push(oCtrl);
					return;
				}
				if (oCtrl.getItems) {
					var items = oCtrl.getItems();
					for (var j = 0; j < items.length; j++) {
						fnCollectInputs(items[j]);
					}
				}
			};
			fnCollectInputs(oFirstCell);
			for (var k = 0; k < aInputs.length; k++) {
				var oInput = aInputs[k];
				var oBinding = oInput.getBinding("value");
				if (!oBinding || !oBinding.getPath) {
					continue;
				}
				var sRelPath = oBinding.getPath();
				if (sRelPath === "materialDesc") {
					cartItemsModel.setProperty(sItemPath + "/materialDesc", oInput.getValue());
				} else if (sRelPath === "materialNo") {
					cartItemsModel.setProperty(sItemPath + "/materialNo", oInput.getValue());
				}
			}
		},
		_flushPendingCartTableInputsToModel: function() {
			var oTable = this.getView().byId("cartItemsTable");
			if (!oTable) {
				return;
			}
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var aRows = oTable.getItems();
			for (var i = 0; i < aRows.length; i++) {
				var oListItem = aRows[i];
				var oCtx = oListItem.getBindingContext("cartItemsModel");
				if (oCtx) {
					this._flushCartRowInputsToModel(oListItem, oCtx.getPath(), cartItemsModel);
				}
			}
		},
		triggerOrderSimulate: function(isCheckOut, arrIndex) {
			var oThis = this;
			var itemSet;
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			if (arrIndex) {
				for (var index = 0; index < arrIndex.length; index++) {
					cartItemsModel.setProperty("/ItemSet/" + arrIndex[index] + "/busy", true);
					cartItemsModel.setProperty("/ItemSet/" + arrIndex[index] + "/isQuantityDisable", true);
				}
			}

			this._flushPendingCartTableInputsToModel();

			var checkOutRequest = OrderServiceUtil.getHeaderForRequest.apply(this);
			itemSet = OrderServiceUtil.getItemSetForRequest.apply(this, [arrIndex]);

			// Set UOM & Description blank for auto determination - OSS 801719 2022 - I561959
			// Keep ItemDescr for material types where the user edits free text (see formatter.isItemEligibleForEdit).
			var itemCount = cartItemsModel.getProperty("/ItemSet").length;
			if (arrIndex && arrIndex.length >= 1) {
				itemCount = arrIndex.length;
			}
			var itemSetIdx = 0;
			for (var itemIndex = 0; itemIndex < itemCount; itemIndex++) {
				var cartItem;
				if (arrIndex && arrIndex.length >= 1) {
					cartItem = cartItemsModel.getProperty("/ItemSet/" + arrIndex[itemIndex]);
				} else {
					cartItem = cartItemsModel.getProperty("/ItemSet/" + itemIndex);
				}
				if (!cartItem.materialNo) {
					continue;
				}
				if (itemSetIdx < itemSet.length) {
					if (!formatter.isItemEligibleForEdit(cartItem.materialType)) {
						itemSet[itemSetIdx].ItemDescr = "";
					}
					itemSet[itemSetIdx].SalesUnit = "";
					itemSetIdx++;
				}
			}

			checkOutRequest.ItemSet = itemSet;

			var HeaderPartnerSet = [];
			var partner = OrderServiceUtil.getHeaderPartnerForRequest.apply(this);
			if (partner && isCheckOut) {
				HeaderPartnerSet.push(partner);
			}
			checkOutRequest.HeaderPartnerSet = HeaderPartnerSet;

			var oModel = this.getModel();
			oModel.create("/HeaderSet", checkOutRequest, {
				success: function(data) {
					oThis.onOrderSimulateSuccessCallback(data, isCheckOut, arrIndex);
				},
				error: function(error) {
					oThis.onOrderSimulateErrorCallback(error);
				}
			});
		},
		onOrderSimulateSuccessCallback: function(data, isCheckOut, arrIndex) {
			//this is to assign the contact person of SH from contact person of CP.
			var tempContactName;
			var tempContactNumber;
			for (var c = 0; c < data.HeaderPartnerSet.results.length; c++) {
				if (data.HeaderPartnerSet.results[c].PartnerFunctionCode === "CP") {
					tempContactName = data.HeaderPartnerSet.results[c].Name;
					tempContactNumber = data.HeaderPartnerSet.results[c].CellPhoneNumber;
					break;
				}
			}
			for (var a = 0; a < data.HeaderPartnerSet.results.length; a++) {
				if (data.HeaderPartnerSet.results[a].PartnerFunctionCode === "SH") {
					data.HeaderPartnerSet.results[a].Name2 = tempContactName;
					data.HeaderPartnerSet.results[a].CellPhoneNumber = tempContactNumber;
					break;
				}
			}
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var oViewModel = this.getView().getModel("cartViewModel");
			var itemSetResults = null;
			var itemCount = 0;
			var itemSet = [];
			var deliveryPlantCode;
			var deliveryPlant;
			var isConfirmedQuanZero = false;
			var isLineItemAmtZero = false;
			var isImOrderConfirmedQty = false;
			var cartItem;

			if (data.ItemSet) {
				itemSetResults = data.ItemSet.results;
				itemCount = itemSetResults.length;

				for (var itemIndex = 0; itemIndex < itemCount; itemIndex++) {
					var responseItem = itemSetResults[itemIndex];
					var item = this.OrderServiceUtil.updateItemWithResponse(responseItem);
					var itemCategoryCode = responseItem.ItemCategoryCode;
					if (responseItem.ConfirmedQty === "0" && data.SalesOrderTypeCode === "YIO") {
						isConfirmedQuanZero = true;
					}

					if (responseItem.ConfirmedQty !== responseItem.OrderQty) {
						isImOrderConfirmedQty = true;
					}

					if (!(itemCategoryCode === "YAOS" || itemCategoryCode === "YQOS") && parseFloat(responseItem.Kzwi2) <= 0) {
						isLineItemAmtZero = true;
					}

					deliveryPlantCode = responseItem.Plant;
					deliveryPlant = responseItem.PlantDescr;

					OrderServiceUtil.updatePriceCondResInItem.apply(this, [responseItem, item]);
					OrderServiceUtil.updateSalesUnitInItem.apply(this, [responseItem, item]);
					
					item.thirdPartySelected = !!item.thirdPartySelected;        //Changes by I561959 - Fix for UI upgrade
					itemSet.push(item);
				}
			}
			if (arrIndex && arrIndex.length >= 1) {
				for (var index = 0; index < itemSet.length; index++) {
					cartItemsModel.setProperty("/ItemSet/" + arrIndex[index], itemSet[index]);
				}
				this.arrItemIndex = [];
			} else {
				cartItemsModel.setProperty("/ItemSet", itemSet);
				if (!isCheckOut) {
					cartItem = this.createEmptyItem();
					cartItemsModel.setProperty("/ItemSet/" + itemSet.length, cartItem);
				}
			}
			OrderServiceUtil.updateHeaderPartnerInModel.apply(this, [data]);
			this.updateProductValue();
			if (isConfirmedQuanZero) {
				sap.m.MessageToast.show(
					this.getResourceBundle().getText("confirmedQuantityCheck"), {
						duration: 6000
					});
			} else if (isLineItemAmtZero) {
				sap.m.MessageToast.show(
					this.getResourceBundle().getText("invalidItemAmountMsg"), {
						duration: 6000
					});
			} else if (data.SalesOrderTypeCode === "YIO" && isImOrderConfirmedQty) {
				sap.m.MessageToast.show(
					this.getResourceBundle().getText("invalidConfQtyMsgForIMO"), {
						duration: 6000
					});
			} else if (isCheckOut) {
				OrderServiceUtil.updateHeaderTextInModel.apply(this, [data]);
				OrderServiceUtil.updateHeaderDataInModel.apply(this, [data, deliveryPlant, deliveryPlantCode]);
				this.getOwnerComponent().getRouter().navTo("OrderShipment", null, true);
				oViewModel.setProperty("/busy", false);
				return;
			}
			//cartItem = this.createEmptyItem();
			//cartItemsModel.setProperty("/ItemSet/" + cartItemLength, cartItem);
			//cartItemsModel.setProperty("/addButtonEnabled", false);
			cartItemsModel.setProperty("/checkoutButtonEnabled", true);
			this.updateTotalItemCount();
			oViewModel.setProperty("/busy", false);
		},
		createEmptyItem: function() {
			var cartHeaderModel = this.getModel("cartHeaderModel");
			var requestedDeliveryDateValue = cartHeaderModel.getProperty("/requestedPickupDate");
			var requestedPickUpValueState = cartHeaderModel.getProperty("/requestedPickupDateValueState");
			var orderType = cartHeaderModel.getProperty("/orderType");
			var cartItem = {};
			if (requestedPickUpValueState === "Error") {
				var todayDate = new Date();
				cartItem.deliveryDate = todayDate;
				cartItem.deliveryDateInputValue = formatter.getDateInputValueString(todayDate);
			} else {
				cartItem.deliveryDate = requestedDeliveryDateValue;
				cartItem.deliveryDateInputValue = formatter.getDateInputValueString(requestedDeliveryDateValue);     //C5267297 669229 / 2019 new line with default blank date
			}
			if (orderType === "YOR1") {
				cartItem.thirdPartySelected = true;
			}

			cartItem.discountType = "%";
			this.addFocusToLastItem();

			return cartItem;

		},

		addFocusToLastItem: function() {
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var itemSet = cartItemsModel.getProperty("/ItemSet");
			var itemCount = itemSet.length;
			var cartItemsTable = this.getView().byId("cartItemsTable");
			cartItemsTable.addEventDelegate({
				onAfterRendering: function() {
					setTimeout(function() {
						if ($("input:enabled[id*=cartItemsTable-" + itemCount + "]")[0]) {
							$("input:enabled[id*=cartItemsTable-" + itemCount + "]")[0].focus();
						}
					});
				}

			});

		},

		setFocus: function() {
			var cartItemsTable = this.getView().byId("cartItemsTable");
			var itemCount = 1;
			cartItemsTable.addEventDelegate({
				onAfterRendering: function() {
					setTimeout(function() {
						if ($("input[id*=cartItemsTable-" + itemCount + "]")[1]) {
							$("input[id*=cartItemsTable-" + itemCount + "]")[1].focus();
						}
					});
				}

			});

		},

		onOrderSimulateErrorCallback: function(error) {
			var oViewModel = this.getView().getModel("cartViewModel");
			oViewModel.setProperty("/busy", false); //added by i327900 #607288 epos screen freeze
			var errorResponse = JSON.parse(error.responseText);
			var errorMessage = errorResponse.error.message.value;
			sap.m.MessageToast.show(
				errorMessage, {
					duration: 6000
				});
		},

		handleCheckout: function() {
			//start of addition by i327900 #607288	
			if (this.bOnInputChangeStarted) {
				this.bHandleCheckout = true;
				//	return; //Commented by C5253525 274868/2018/ePOS order entry screen-duplicated payment
			} else { //Added by C5253525 274868/2018/ePOS order entry screen-duplicated payment
				this.bHandleCheckout = false;
			} //Added by C5253525 274868/2018/ePOS order entry screen-duplicated payment
			//end of addition by i327900 #607288	
			var oViewModel = this.getView().getModel("cartViewModel");
			oViewModel.setProperty("/busy", true);
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			var isCartEmpty = this.isCartEmpty();
			if (!isCartEmpty) {
				var isDeliveryPlantExist = this.isDeliveryPlantExist();
				var isCartValid = this.validateCart();
				var isValidCustomerPO = this.validateCustomerPO();
				var isValidRequestPickupDate = this.validateRequestPickupDate();
				if (isCartValid && isDeliveryPlantExist && isValidCustomerPO && isValidRequestPickupDate) {
					var isCartLineItemAmountValid = this.validateCartLineItemAmount();
					if (isCartLineItemAmountValid) {
						orderHeaderModel.setProperty("/isCheckOut", true);
						this.triggerOrderSimulate(true);
					} else {
						sap.m.MessageToast.show(
							this.getResourceBundle().getText("invalidItemAmountMsg"), {
								duration: 6000
							});
						oViewModel.setProperty("/busy", false);
					}
				} else {
					sap.m.MessageToast.show(
						this.getResourceBundle().getText("mandatoryFieldsCheck"), {
							duration: 6000
						});
					oViewModel.setProperty("/busy", false);
				}
			} else {
				sap.m.MessageToast.show(
					this.getResourceBundle().getText("addItems"), {
						duration: 6000
					});
				oViewModel.setProperty("/busy", false);
			}
		},
		//start of changes by i327900 #607288
		onInputChange: function(oEvent) {
			this.bOnInputChangeStarted = true;
			var matnr = oEvent.getSource().getValue();
			var urlParameters;
			urlParameters = {
				"Matnr": matnr

			};
			var oModel = this.getModel();
			var oCtrl = this;
			this.oMaterialInp = oEvent.getSource();
			oModel.callFunction(
				"/CheckItem", {
					method: "GET",
					async: false,
					urlParameters: urlParameters,
					success: function(data) {
						var oCartItemsModel = oCtrl.getOwnerComponent().getModel("cartItemsModel");
						oCartItemsModel.setProperty("/materialNo", data.Matnr);

						oCtrl.oMaterialInp.setValue(data.Matnr);
						oCtrl.oMaterialInp = undefined;
						oCtrl.bOnInputChangeStarted = false;
						if (oCtrl.bHandleCheckout) {
							oCtrl.handleCheckout();
						}
					},
					error: function(error) {
						var errorResponse = JSON.parse(error.responseText);
						var errorMessage = errorResponse.error.message.value;
						sap.m.MessageToast.show(errorMessage, {
							duration: 6000
						});
						oCtrl.bOnInputChangeStarted = false;
						if (oCtrl.bHandleCheckout) {
							oCtrl.handleCheckout();
						}
					}
				}
			);
		}

		//end of changes by i327900 #607288
	});

});