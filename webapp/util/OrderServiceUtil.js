/*Change History
 ***********************************************************************
 * Date         Incident      Author      Description
 * --------    -----------  ---------    ------------------
 *03/02/2018    #110346    C5253525     ePOS ATP freeze in Order App
                #107607                 ePOS missing date in Order App in google chrome
 	            #10762                  ePOS Order app price not calculating
 ***********************************************************************
 */
sap.ui.define([
	"com/csr/order/model/formatter"
], function (formatter) {
	"use strict";

	return {
		formatter: formatter,
		getHeaderForRequest: function () {
			var checkOutRequest = {};
			var oCustomerModel = this.getOwnerComponent().getModel("customerModel");
			var cartHeaderModel = this.getModel("cartHeaderModel");
			var cashCustomer = oCustomerModel.getProperty("/cashCustomer");
			var customerID;
			if (cashCustomer) {
				customerID = cartHeaderModel.getProperty("/customerID");
			} else {
				customerID = oCustomerModel.getProperty("/referenceCustomer");
			}

			var salesOrg = oCustomerModel.getProperty("/salesOrg");
			var distChannel = oCustomerModel.getProperty("/distChannel");
			var division = oCustomerModel.getProperty("/division");
			var shipToValue = cartHeaderModel.getProperty("/shipTo");
			var paymentTerm = cartHeaderModel.getProperty("/customerPaymentTerm");
			var salesOrderTypeCode = cartHeaderModel.getProperty("/orderType");
			var customerPO = cartHeaderModel.getProperty("/customerPO");
			var customerNotes = cartHeaderModel.getProperty("/customerNotes");
			var printPickList = cartHeaderModel.getProperty("/printPickList");
			var shippingMode = cartHeaderModel.getProperty("/shippingMode");
			var deliveryType = cartHeaderModel.getProperty("/deliveryType");
			var vbelnRef = cartHeaderModel.getProperty("/VbelnRef");
			var tatpStatus = cartHeaderModel.getProperty("/tatpStatus");

			checkOutRequest.SalesOrderTypeCode = salesOrderTypeCode;
			checkOutRequest.SoldToPartyID = customerID;
			checkOutRequest.SalesOrganization = salesOrg;
			checkOutRequest.DistributionChannel = distChannel;
			checkOutRequest.Division = division;
			checkOutRequest.PaymentTermCode = paymentTerm;
			checkOutRequest.PurchaseOrderNumber = customerPO;
			checkOutRequest.ZdelvType = deliveryType;

			if (printPickList) {
				checkOutRequest.ZnoPckslp = "X";
			}

			if (shippingMode === "pickup") {
				checkOutRequest.Zzdpind = "P";
				checkOutRequest.Vhtyp = ""; //C5267297 #112289 - veh type
			} else {
				checkOutRequest.Zzdpind = "D";
				checkOutRequest.Vhtyp = cartHeaderModel.getProperty("/vechicleType"); //C5267297 #112289 - veh type
			}
			checkOutRequest.Tslot = cartHeaderModel.getProperty("/timeSlot");
			//checkOutRequest.Vhtyp = cartHeaderModel.getProperty("/vechicleType");       //C5267297 #112289 - veh type 

			if (tatpStatus === "S") {
				checkOutRequest.TatpOk = "X";
			} else if (tatpStatus === "W") {
				checkOutRequest.TatpOk = " ";
			} else if (tatpStatus === "E") {
				checkOutRequest.TatpOk = "-";
			}

			var headerTextSet = this.OrderServiceUtil.getHeaderTextForRequest.apply(this, [customerNotes]);
			if (headerTextSet) {
				checkOutRequest.HeaderTextSet = headerTextSet;
			}
			//var HeaderPartnerSet = [];
			checkOutRequest.Kunwe = shipToValue;
			//checkOutRequest.HeaderPartnerSet = HeaderPartnerSet;

			checkOutRequest.Simul = "X";

			if (salesOrderTypeCode !== "YIO" && salesOrderTypeCode !== "YQT") {
				var requestedPickupDate = cartHeaderModel.getProperty("/requestedPickupDate");
				checkOutRequest.RequestedDeliveryDate = this.formatter.formatDate(requestedPickupDate);

			} else if (salesOrderTypeCode === "YQT") {
				var validTo = cartHeaderModel.getProperty("/quoteEndDate");

				if (validTo) {
					checkOutRequest.Bnddt = this.formatter.formatDate(validTo);
				}
				checkOutRequest.Angdt = this.formatter.formatDate(new Date());
			}
			if (vbelnRef) {
				checkOutRequest.VbelnRef = vbelnRef;
			}
			return checkOutRequest;
		},
		getHeaderTextForRequest: function (customerNotes) {
			var headerTextSet = null;
			if (customerNotes) {
				headerTextSet = [];
				var customerNote = {};
				customerNote.Id = "Y007";
				customerNote.TextString = customerNotes;
				headerTextSet.push(customerNote);
			}
			return headerTextSet;
		},
		getHeaderPartnerForRequest: function () {
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");

			var partner = {};
			var partnerFunctionCode = orderHeaderModel.getProperty("/shipToFunctionCode");
			if (!partnerFunctionCode) {
				return null;
			}
			partner.AddressID = orderHeaderModel.getProperty("/addressID");
			//	partner.CellPhoneNumber = orderHeaderModel.getProperty("/cellPhoneNumber");//commented by C5253525 incident-265550
			partner.City = orderHeaderModel.getProperty("/subrub");
			partner.CountryCode = orderHeaderModel.getProperty("/countryCode");
			partner.CountryDescr = orderHeaderModel.getProperty("/countryDes");
			partner.CustomerID = orderHeaderModel.getProperty("/customerID");
			partner.Email = orderHeaderModel.getProperty("/email");
			partner.FaxExtension = orderHeaderModel.getProperty("/faxExtension");
			partner.FaxNumber = orderHeaderModel.getProperty("/faxNumber");
			partner.HouseNumber = orderHeaderModel.getProperty("/houseNumber");
			partner.Name = orderHeaderModel.getProperty("/shipToName");
			partner.Name2 = orderHeaderModel.getProperty("/contactPerson");
			partner.PartnerFunctionCode = "SH";
			partner.PartnerFunctionDescr = orderHeaderModel.getProperty("/partnerFunctionDesc");
			partner.PhoneExtension = orderHeaderModel.getProperty("/phoneExt");
			partner.PhoneNumber = orderHeaderModel.getProperty("/phoneNo");
			partner.PostalCode = orderHeaderModel.getProperty("/postalCode");
			partner.RegionCode = orderHeaderModel.getProperty("/state");
			partner.RegionDescr = orderHeaderModel.getProperty("/stateDesc");
			partner.SalesOrderID = orderHeaderModel.getProperty("/salesOrderID");
			partner.Street = orderHeaderModel.getProperty("/streetAddress");
			partner.TitleCode = orderHeaderModel.getProperty("/titleCode");
			partner.CellPhoneNumber = orderHeaderModel.getProperty("/mobileNumber"); //added by C5253525 incident-265550
			//	partner.MOBNUM = orderHeaderModel.getProperty("/mobileNumber");  //changes made here by I327900(suhas)//Commented by C5253525

			return partner;
		},
		getHeaderForCreateOrder: function () {
			var createOrderRequest = {};
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			var oCustomerModel = this.getOwnerComponent().getModel("customerModel");
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			var cashCustomer = oCustomerModel.getProperty("/cashCustomer");
			var customerID;
			if (cashCustomer) {
				customerID = cartHeaderModel.getProperty("/customerID");
			} else {
				customerID = oCustomerModel.getProperty("/referenceCustomer");
			}
			var salesOrg = oCustomerModel.getProperty("/salesOrg");
			var distChannel = oCustomerModel.getProperty("/distChannel");
			var division = oCustomerModel.getProperty("/division");
			var salesOrderTypeCode = orderHeaderModel.getProperty("/orderTypeCode");
			var paymentTerm = orderHeaderModel.getProperty("/paymentTerm");
			var customerPO = orderHeaderModel.getProperty("/customerPO");
			var smsSelected = orderHeaderModel.getProperty("/smsSelected");

			var printPickList = orderHeaderModel.getProperty("/printPickList");

			var shippingMode = cartHeaderModel.getProperty("/shippingMode");
			var deliveryType = cartHeaderModel.getProperty("/deliveryType");
			var tatpStatus = cartHeaderModel.getProperty("/tatpStatus");

			createOrderRequest.SalesOrderTypeCode = salesOrderTypeCode;
			createOrderRequest.SoldToPartyID = customerID;
			createOrderRequest.SalesOrganization = salesOrg;
			createOrderRequest.DistributionChannel = distChannel;
			createOrderRequest.Division = division;
			createOrderRequest.PaymentTermCode = paymentTerm;
			createOrderRequest.PurchaseOrderNumber = customerPO;
			createOrderRequest.ZnoPckslp = printPickList;

			if (shippingMode === "pickup") {
				createOrderRequest.Zzdpind = "P";
				createOrderRequest.Vhtyp = ""; //C5267297 #112289 - veh type
			} else {
				createOrderRequest.Zzdpind = "D";
				createOrderRequest.Vhtyp = cartHeaderModel.getProperty("/vechicleType"); //C5267297 #112289 - veh type
			}

			createOrderRequest.ZdelvType = deliveryType;
			if (smsSelected) {
				createOrderRequest.Zztelf1 = orderHeaderModel.getProperty("/mobileNumber");
				createOrderRequest.Zzsms = "X";
			}
			createOrderRequest.Tslot = cartHeaderModel.getProperty("/timeSlot");
			//	createOrderRequest.Vhtyp = cartHeaderModel.getProperty("/vechicleType");                 //C5267297 #112289 - veh type

			if (tatpStatus === "S") {
				createOrderRequest.TatpOk = "X";
			} else if (tatpStatus === "W") {
				createOrderRequest.TatpOk = " ";
			} else if (tatpStatus === "E") {
				createOrderRequest.TatpOk = "-";
			}

			return createOrderRequest;
		},
		getHeaderTextForCreateOrder: function () {
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			var wareHouseNotes = orderHeaderModel.getProperty("/wareHouseNotes");
			var shippingNotes = orderHeaderModel.getProperty("/shippingNotes");
			var customerNotes = orderHeaderModel.getProperty("/customerNotes");

			var noteSet = [];
			if (wareHouseNotes) {
				var wareHouseNote = {};
				wareHouseNote.Id = "Y002";
				wareHouseNote.TextString = wareHouseNotes;
				noteSet.push(wareHouseNote);
			}
			if (shippingNotes) {
				var shippingNote = {};
				shippingNote.Id = "0012";
				shippingNote.TextString = shippingNotes;
				noteSet.push(shippingNote);
			}
			if (customerNotes) {
				var customerNote = {};
				customerNote.Id = "Y007";
				customerNote.TextString = customerNotes;
				noteSet.push(customerNote);
			}
			return noteSet;
		},
		getItemSetForRequest: function (arrIndex) {
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var cartItems = cartItemsModel.getProperty("/ItemSet");
			var itemCount = cartItems.length;
			var ItemSet = [];
			if (arrIndex && arrIndex.length >= 1) {
				itemCount = arrIndex.length;
			}

			for (var itemIndex = 0; itemIndex < itemCount; itemIndex++) {
				var cartItem;
				if (arrIndex && arrIndex.length >= 1) {
					cartItem = cartItemsModel.getProperty("/ItemSet/" + arrIndex[itemIndex]);
				} else {
					cartItem = cartItemsModel.getProperty("/ItemSet/" + itemIndex);
				}

				var item = this.OrderServiceUtil.createItemForReq.apply(this, [cartItem]);
				if (item) {
					ItemSet.push(item);
				}
			}

			return ItemSet;
		},
		getCartCount: function () {
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var cartItems = cartItemsModel.getProperty("/ItemSet");
			var itemCount = cartItems.length;
			var count = 0;
			for (var itemIndex = 0; itemIndex < itemCount; itemIndex++) {
				var cartItem = cartItemsModel.getProperty("/ItemSet/" + itemIndex);
				if (cartItem.materialNo) {
					count++;
				}
			}
			return count;
		},
		createItemForReq: function (cartItem) {
			var cartMaterialNo = cartItem.materialNo;
			var itemDiscount = cartItem.discount;
			var itemDiscountType = cartItem.discountType;
			var materialType = cartItem.materialType;
			var item;
			if (cartMaterialNo) {
				item = this.OrderServiceUtil.getItemHeaderForReq.apply(this, [cartItem]);
				var ItemPriceCondSet = [];
				var itemCondition = this.OrderServiceUtil.getDiscountConditionsForReq.apply(this, [itemDiscount, itemDiscountType, cartItem]);

				if (itemCondition) {
					ItemPriceCondSet.push(itemCondition);
				}

				if (item.Netpr && formatter.isItemEligibleForEdit(materialType)) {
					var materialCondition = {};
					materialCondition.CondTypeCode = "ZPRJ";
					materialCondition.AmountInternal = item.Netpr;
					ItemPriceCondSet.push(materialCondition);
				}
				item.PriceCondSet = ItemPriceCondSet;
				item.SchedLineSet = [];
			}
			return item;
		},
		getItemHeaderForReq: function (cartItem) {
			var cartHeaderModel = this.getModel("cartHeaderModel");
			var vbelnRef = cartHeaderModel.getProperty("/VbelnRef");
			var deliveryPlant = cartHeaderModel.getProperty("/deliveryPlant");
			var item = {};
			var quantity = cartItem.quantity;
			if (!quantity) {
				quantity = "1";
			}
			item.MaterialID = cartItem.materialNo;
			item.ItemDescr = cartItem.materialDesc;
			item.SalesUnit = cartItem.stockUnit;
			item.Plant = deliveryPlant;
			item.OrderQty = quantity;
			item.Uepos = cartItem.uepos;
			item.Netpr = cartItem.salesUnitPrice;
			//Start of Addition by C5253525 #110346
			if (cartItem.deliveryDate === null) {
				cartItem.deliveryDate = cartItem.deliveryDateInputValue;
			}
			//End of Addition by C5253525 #110346

			item.RequestedDeliveryDate = this.formatter.formatDate(cartItem.deliveryDate);
			item.CopyInd = cartItem.CopyInd;
			if (vbelnRef && item.CopyInd) {
				item.ItemID = cartItem.ItemID;
			}
			if (cartItem.thirdPartySelected) {
				item.Is3rdParty = "X";
			}
			return item;
		},
		getDiscountConditionsForReq: function (itemDiscount, itemDiscountType, cartItem) {
			var itemCondition = null;
			if (itemDiscount && itemDiscountType) {
				itemCondition = {};
				if (itemDiscountType === "AUD") {
					itemCondition.CondTypeCode = "ZMA5";
					itemCondition.UnitOfMeasure = cartItem.unitOfMeasure;
				} else {
					itemCondition.CondTypeCode = "ZMA4";
				}
				itemCondition.AmountInternal = itemDiscount;
				itemCondition.Counter = cartItem.counter;

			}
			return itemCondition;
		},
		updateItemWithResponse: function (responseItem) {
			var item = {};
			item.materialNo = responseItem.MaterialID;
			item.materialDesc = responseItem.ItemDescr;
			item.stockUnit = responseItem.SalesUnit;
			item.quantity = responseItem.OrderQty;
			item.unitPrice = responseItem.NetAmount;
			item.currencyUnit = responseItem.DocumentCurrency;
			item.confirmedQuantity = responseItem.ConfirmedQty;
			item.deliveryDateInputValue = this.formatter.getDateInputValueString(responseItem.RequestedDeliveryDate);
			item.deliveryDate = this.formatter.getLocalDate(responseItem.RequestedDeliveryDate);
			item.itemID = responseItem.ItemID;
			item.totalAmount = responseItem.TotalAmount;
			item.SchedLineSet = responseItem.SchedLineSet.results;
			item.PriceCondSet = responseItem.PriceCondSet.results;
			item.thirdPartySelected = responseItem.Is3rdParty;
			item.uepos = responseItem.Uepos;
			item.materialType = responseItem.Mtart;
			item.itemCategory = responseItem.ItemCategoryCode;
			item.kzwi2 = responseItem.Kzwi2;
			item.salesUnitPrice = responseItem.Netpr;
			item.salesUnit = responseItem.Kmein;
			item.ItemID = responseItem.ItemID;
			item.CopyInd = responseItem.CopyInd;
			return item;
		},
		updatePriceCondResInItem: function (responseItem, item) {
			if (responseItem.PriceCondSet && responseItem.PriceCondSet.results) {
				var conditionSet = responseItem.PriceCondSet.results;
				var conditonCount = conditionSet.length;
				for (var conditionIndex = 0; conditionIndex < conditonCount; conditionIndex++) {
					var condition = conditionSet[conditionIndex];
					var conditionType = condition.CondTypeCode;
					if (conditionType === "ZMA4" || conditionType === "ZMA5") {
						var discount = condition.AmountInternal;
						var counter = condition.Counter;
						var discountType;
						if (conditionType === "ZMA5") {
							discountType = "AUD";
							item.unitOfMeasure = condition.UnitOfMeasure;
						} else {
							discountType = "%";
						}
						item.discount = discount;
						item.discountType = discountType;
						item.counter = counter;
						break;
					}
				}
			}
			if (!item.discountType) {
				item.discountType = "%";
			}
		},
		updateSalesUnitInItem: function (responseItem, item) {
			if (responseItem) {
				var salesUnit = responseItem.SalesUnit;
				var kmein = responseItem.Kmein;
				var salesUnitSet = [];
				salesUnitSet.push({
					"salesUnitType": salesUnit
				});
				salesUnitSet.push({
					"salesUnitType": kmein
				});
				item.salesUnitList = salesUnitSet;
			}
		},
		updateHeaderPartnerInModel: function (data) {
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			var countryModel = this.getOwnerComponent().getModel("countryModel");
			var isShipToPartnerRead = false;
			var isBMPartnerRead = false;
			var isPEPartnerRead = false;
			var isCPPartnerRead = false;
			var mobileNo;
			var addedNewItemToCart = orderHeaderModel.getProperty("/newItem");
			var isCheckOut = orderHeaderModel.getProperty("/isCheckOut");
			var shipToFuncCode = orderHeaderModel.getProperty("/shipToFunctionCode");
			var isEligibleToUpdateModel = true;

			if (shipToFuncCode && (addedNewItemToCart || isCheckOut)) {
				isEligibleToUpdateModel = false;
			} else {
				orderHeaderModel.setProperty("/wareHouseNotes", "");
				orderHeaderModel.setProperty("/shippingNotes", "");
			}
			orderHeaderModel.setProperty("/newItem", false);
			orderHeaderModel.setProperty("/isCheckOut", false);

			if (data.HeaderPartnerSet && data.HeaderPartnerSet.results && isEligibleToUpdateModel) {
				var partnerSet = data.HeaderPartnerSet.results;
				var partnerCount = partnerSet.length;
				for (var partnerIndex = 0; partnerIndex < partnerCount; partnerIndex++) {
					var partner = partnerSet[partnerIndex];
					if (partner.PartnerFunctionCode === "SH") {
						orderHeaderModel.setProperty("/addressID", partner.AddressID);
						orderHeaderModel.setProperty("/cellPhoneNumber", partner.CellPhoneNumber);
						orderHeaderModel.setProperty("/subrub", partner.City);
						orderHeaderModel.setProperty("/countryCode", partner.CountryCode);
						var sCountryCode = countryModel.getProperty("/countryCode");
						if (!sCountryCode || sCountryCode === "") {
							sCountryCode = partner.CountryCode;
							countryModel.setProperty("/countryCode", sCountryCode);
							orderHeaderModel.setProperty("/countryCode", sCountryCode);
						}
						orderHeaderModel.setProperty("/countryDes", partner.CountryDescr);
						orderHeaderModel.setProperty("/customerID", partner.CustomerID);
						orderHeaderModel.setProperty("/email", partner.Email);
						orderHeaderModel.setProperty("/faxExtension", partner.FaxExtension);
						orderHeaderModel.setProperty("/faxNumber", partner.FaxNumber);
						orderHeaderModel.setProperty("/houseNumber", partner.HouseNumber);
						orderHeaderModel.setProperty("/shipToName", partner.Name);
						orderHeaderModel.setProperty("/contactPerson", partner.Name2);
						orderHeaderModel.setProperty("/partnerFunctionDesc", partner.PartnerFunctionDescr);
						orderHeaderModel.setProperty("/phoneExt", partner.PhoneExtension);
						orderHeaderModel.setProperty("/phoneNo", partner.PhoneNumber);
						orderHeaderModel.setProperty("/postalCode", partner.PostalCode);
						orderHeaderModel.setProperty("/state", partner.RegionCode);
						orderHeaderModel.setProperty("/stateDesc", partner.RegionDescr);
						orderHeaderModel.setProperty("/salesOrderID", partner.SalesOrderID);
						orderHeaderModel.setProperty("/streetAddress", partner.Street);
						orderHeaderModel.setProperty("/titleCode", partner.TitleCode);
						orderHeaderModel.setProperty("/headerShipTo", partner.Name);
						orderHeaderModel.setProperty("/shipToFunctionCode", partner.PartnerFunctionCode);
						//orderHeaderModel.setProperty("/mobileNumber", partner.CellPhoneNumber); //commented  by C5253525 incident-265550
						isShipToPartnerRead = true;
					} else if (partner.PartnerFunctionCode === "YA") {
						orderHeaderModel.setProperty("/bmPartner", partner);
						isBMPartnerRead = true;
					} else if (partner.PartnerFunctionCode === "PE") {
						orderHeaderModel.setProperty("/pePartnerCustomerID", partner.CustomerID);
						isPEPartnerRead = true;
					} else if (partner.PartnerFunctionCode === "CP") {
						mobileNo = partner.CellPhoneNumber;
						mobileNo = mobileNo.replace(/ /g, "");
						orderHeaderModel.setProperty("/mobileNumber", mobileNo);
						isCPPartnerRead = true;
					}

					if (isShipToPartnerRead && isBMPartnerRead && isPEPartnerRead && isCPPartnerRead) {
						break;
					}
				}
			}
		},
		updateHeaderDataInModel: function (data, deliveryPlant, deliveryPlantCode) {
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			var cartHeaderModel = this.getModel("cartHeaderModel");
			orderHeaderModel.setProperty("/netAmount", data.NetAmount);
			orderHeaderModel.setProperty("/freightCharges", data.FreightChgs);
			orderHeaderModel.setProperty("/taxAmount", data.TaxAmount);
			orderHeaderModel.setProperty("/totalAmount", data.TotalAmount);
			orderHeaderModel.setProperty("/customer", data.SoldToPartyDescr);
			orderHeaderModel.setProperty("/currency", data.DocumentCurrency);
			orderHeaderModel.setProperty("/incoTerms1", data.Inco1);
			orderHeaderModel.setProperty("/soldToPartyID", data.SoldToPartyID);
			orderHeaderModel.setProperty("/requestedDeliveryDate", data.RequestedDeliveryDate);
			orderHeaderModel.setProperty("/quoteEndDate", data.Bnddt);
			orderHeaderModel.setProperty("/customerPO", data.PurchaseOrderNumber);
			orderHeaderModel.setProperty("/weight", data.BtgewR);
			orderHeaderModel.setProperty("/weightUnit", data.GeweiR);
			orderHeaderModel.setProperty("/area", data.VolumR);
			orderHeaderModel.setProperty("/areaUnit", data.VolehR);
			orderHeaderModel.setProperty("/orderType", data.SalesOrderTypeDescr);
			orderHeaderModel.setProperty("/orderTypeCode", cartHeaderModel.getProperty("/orderType"));
			orderHeaderModel.setProperty("/paymentTerm", cartHeaderModel.getProperty("/customerPaymentTerm"));
			orderHeaderModel.setProperty("/deliveryPlantCode", deliveryPlantCode);
			orderHeaderModel.setProperty("/deliveryPlantDesc", deliveryPlant);
			orderHeaderModel.setProperty("/printPickList", data.ZnoPckslp);
			orderHeaderModel.setProperty("/shippingMode", data.Zzdpind);
			orderHeaderModel.setProperty("/deliveryType", data.ZdelvType);
			orderHeaderModel.setProperty("/timeSlot", data.Tslot);
			orderHeaderModel.setProperty("/vechicleType", data.Vhtyp);
			orderHeaderModel.setProperty("/VbelnRef", cartHeaderModel.getProperty("/VbelnRef"));
			orderHeaderModel.setProperty("/tatpStatus", cartHeaderModel.getProperty("/tatpStatus"));
		},
		updateHeaderTextInModel: function (data) {
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			if (data.HeaderTextSet && data.HeaderTextSet.results) {
				var headerTextSet = data.HeaderTextSet.results;
				var headerTextCount = headerTextSet.length;

				for (var headerTextIndex = 0; headerTextIndex < headerTextCount; headerTextIndex++) {
					var headerText = headerTextSet[headerTextIndex];
					if (headerText.Id === "Y007") {
						orderHeaderModel.setProperty("/customerNotes", headerText.TextString);
					}
				}

			}
		},
		clearValuesInModel: function () {
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			var catalogueModel = this.getOwnerComponent().getModel("catalogueModel");
			var oCustomerModel = this.getOwnerComponent().getModel("customerModel");
			var storeFirstName = oCustomerModel.getProperty("/firstName");
			var storeLastName = oCustomerModel.getProperty("/lastName");
			var storeBusinessName = oCustomerModel.getProperty("/businessName");
			var storeDeliveryPlant = oCustomerModel.getProperty("/storeId");
			var storePayment = oCustomerModel.getProperty("/customerPaymentTerm");
			var storeClubGyprock = oCustomerModel.getProperty("/customerClubGyprock");
			var storeBillingMode = oCustomerModel.getProperty("/customerBilling");
			var storeDeliveryBlockMode = oCustomerModel.getProperty("/customerDelivery");
			var storePORequired = oCustomerModel.getProperty("/purchaseOrderRequired");
			var storeNotes = oCustomerModel.getProperty("/customerNotes");
			var storeEmail = oCustomerModel.getProperty("/email");
			var quoteEndDate = new Date();
			quoteEndDate.setDate(quoteEndDate.getDate() + 90);
			//C5267297 - 141036 - Customer number update
			var customerId = oCustomerModel.getProperty("/customerID");
			cartHeaderModel.setProperty("/customerID", customerId);
			//End of the changes for 141036
			cartHeaderModel.setProperty("/customerPO", "");
			cartHeaderModel.setProperty("/firstName", storeFirstName);
			cartHeaderModel.setProperty("/businessName", storeBusinessName);
			cartHeaderModel.setProperty("/lastName", storeLastName);
			cartHeaderModel.setProperty("/deliveryPlant", storeDeliveryPlant);
			cartHeaderModel.setProperty("/customerPaymentTerm", storePayment);
			cartHeaderModel.setProperty("/customerClubGyprock", storeClubGyprock);
			cartHeaderModel.setProperty("/customerBilling", storeBillingMode);
			cartHeaderModel.setProperty("/customerDelivery", storeDeliveryBlockMode);
			cartHeaderModel.setProperty("/CreditBlock", oCustomerModel.CreditBlock);

			cartHeaderModel.setProperty("/productValue", "0.00");
			cartHeaderModel.setProperty("/customerNotes", storeNotes);
			cartHeaderModel.setProperty("/shippingMode", "pickup");
			cartHeaderModel.setProperty("/printPickList", false);
			cartHeaderModel.setProperty("/tatpStatus", "");
			//	cartHeaderModel.setProperty("/deliveryType", "");                    //C5267297 #112289 - delivery 
			//	cartHeaderModel.setProperty("/timeSlot", "");
			//	cartHeaderModel.setProperty("/vechicleType", "");
			cartHeaderModel.setProperty("/VbelnRef", "");
			cartHeaderModel.setProperty("/orderType", "YIR");
			cartHeaderModel.setProperty("/requestedPickupDate", new Date());
			cartHeaderModel.setProperty("/quoteStartDate", new Date());
			cartHeaderModel.setProperty("/quoteEndDate", quoteEndDate);
			cartHeaderModel.setProperty("/shipTo", "");
			cartHeaderModel.setProperty("/purchaseOrderRequired", storePORequired);
			cartHeaderModel.setProperty("/email", storeEmail);
			oCustomerModel.setProperty("/cashCustomer", false);
			var orderHeaderInitialData = {
				"smsSelected": true
			};
			orderHeaderModel.setData(orderHeaderInitialData);

			catalogueModel.setProperty("/isProductListVisible", true);
			catalogueModel.setProperty("/isOrderListVisible", false);
			catalogueModel.setProperty("/searchVal", "");
		}
	};

});