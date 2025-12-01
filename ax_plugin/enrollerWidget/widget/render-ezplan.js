jQuery(function ($) {
    var planMethod = "ezypay";
    $.axWidget("axcelerate.render_ezplan", {
        options: {
            fieldRenderer: function () {
                return null;
            },
            updateField: function () {
                return null;
            },
            getInputValue: function () {
                return null;
            },

            renderRules: function (rules, cost, location, method) {
                return [];
            },
            calculateDiscount: function () {},
            lockPlanAndNextStep: function (planID) {},
            multiple_mode: false,
            lock_promo_code: false,
            getPaymentMethods: function () {}
        },
        _destroy() {
            var $this = this;
            $this.element.empty();
            $this.element.removeClass("widget-init");
            $this._unbind();
        },
        refresh: function () {
            var $this = this;
            $this._unbind();
            $this.element.addClass("widget-init");
            $this._renderContent();
            $this._bind();
        },

        _init: function () {
            return this;
        },
        _create: function () {
            var $this = this;
            window.renderEZ = $this;
            $this._unbind();
            $this.refresh();
        },
        _unbind: function () {
            var $this = this;
            $this.element.off();
        },
        _bind: function () {
            var $this = this;
            $this.element.off("enroller:epay_detail_load");
            $this.element.off("enroller:course_discount_displayed");
            $this.element.off("enroller:plan_multiple_instances");

            $this.element.off("enroller:course_cost_updated");

            $this.element.on("enroller:epay_detail_load", function (event, payload) {
                function correctButtonFunction() {
                    var button = $this.element.find("#ezypay");
                    button
                        .off()

                        .on("click", function () {
                            var rule = button.data("rule");

                            $this.options.lockPlanAndNextStep({
                                ezypay_plan_selected: rule.TERM_ID
                            });
                        });
                }
                function hideLock() {
                    if ($this.options.lock_ez_plan) {
                        $this.element.find("#lock_ez").closest("div").hide();
                    }
                }
                $this.element
                    .find("#paymentBack")
                    .closest("div")
                    .find(".enroller-field-label")
                    .hide();

                $this.element.find("#epayment_rule_holder > div").css({
                    width: "95%",
                    "margin-left": "auto",
                    "margin-right": "auto",
                    "max-width": "initial",
                    display: "block"
                });

                // Make sure that this has definitely been done.
                hideLock();
                correctButtonFunction();

                $(document).one("ajaxStop", function () {
                    hideLock();
                    correctButtonFunction();
                });

                setTimeout(function () {
                    hideLock();
                    correctButtonFunction();
                }, 200);
            });

            $this.element.on("enroller:course_discount_displayed", function (event, payload) {
                $this.updateCourseCost(payload.discounts, payload.course);
            });
            $this.element.on("enroller:plan_multiple_instances", function (event, payload) {
                $this.options.multi_course_data = payload.courses;
                $this.renderMultipleCourse(payload.courses);
            });
        },

        updateCourseCost: function (discounts, course) {
            var $this = this;
            var allCourses = $this.options.multi_course_data;
            var ids = Object.keys(allCourses);
            var total = 0;
            for (var i = 0; i < ids.length; i++) {
                var cID = ids[i];
                var thisCourse = allCourses[cID];
                var instanceData = thisCourse.instanceData;

                var discountedPrice = thisCourse.discounted_price;
                if (discountedPrice == null) {
                    discountedPrice = instanceData.COST;
                }

                if (instanceData.INSTANCEID === parseInt(course.INSTANCEID, 10)) {
                    if (discounts && discounts.REVISEDPRICE != null) {
                        thisCourse.discounts_applied = discounts.DISCOUNTSAPPLIED;
                        discountedPrice = discounts.REVISEDPRICE;
                        thisCourse.discounted_price = discountedPrice;
                    }
                }
                total += discountedPrice;

                allCourses[cID] = thisCourse;
                $this.options.multi_course_data = allCourses;
            }

            enroller.options.cost = total;

            // Need a hash to pass the status check.
            if (enroller.options.enrolment_hash && enroller.options.enrolment_hash !== "") {
                $this.element.trigger("enroller:course_cost_updated", {});
            } else {
                enroller.element.trigger("enroller:enrolment_status_update", {
                    user_contact_id: enroller.options.user_contact_id,
                    contact_id: enroller.options.contact_id,
                    payer_id: enroller.options.payer_id,
                    contact_id: enroller.options.contact_id,
                    config_id: enroller.options.config_id
                });
                enroller.element.one("enroller:status_update_complete", function () {
                    $this.element.trigger("enroller:course_cost_updated", {});
                });
            }
        },
        renderIndividualCourse: function (course, index) {
            var $this = this;
            $this.element.off("enroller:course_cost_updated");
            //$this.element.find(".instance-holder").remove();
            var multiHolder = $this.element.find(".multi-holder");

            var instanceData = course.instanceData;
            var instanceHolder = $("<div/>").addClass("instance-holder");
            var courseData = {
                INSTANCEID: instanceData.INSTANCEID,
                cost: instanceData.COST,
                TYPE: instanceData.TYPE,
                ID: instanceData.ID
            };
            multiHolder.append(instanceHolder);
            $this.renderCourseInfoBlock(instanceHolder, instanceData, index);
            $this.renderDiscounts(courseData, instanceHolder);
            $("#calculate_" + instanceData.INSTANCEID).trigger("click");

            var courses = $this.options.multi_course_data;
            var keys = Object.keys(courses);
            var notLastCourse = keys.length - 1 > index;

            $this.element.on("enroller:course_cost_updated", function () {
                $this.element.find(".total-holder").remove();
                $(".ez-total").remove();
                var totalHolder = $("<div/>").addClass("total-holder");
                instanceHolder.append(totalHolder);

                var discFooter = {
                    DISPLAY: "Total " + enroller.options.cost_terminology + " For All Courses",
                    TYPE: "information",
                    INFO_ONLY: true
                };
                totalHolder.append(enroller._createInputField("tot_foot", discFooter));
                var discountedPrice = enroller._createInformationField(
                    "Total " + enroller.options.cost_terminology,
                    enroller._currencyDisplayFormat(enroller.options.cost)
                );

                totalHolder.append(discountedPrice);
                totalHolder.enhanceWithin();
                if (!notLastCourse) {
                    $this._renderPaymentMethod();
                    //$this._renderEzySection();
                }
            });

            if (notLastCourse) {
                var nextCourse = enroller._createInputField("next_course_" + index, {
                    DISPLAY: "Next " + enroller.options.course_terminology,
                    TYPE: "button"
                });
                nextCourse.find("a").addClass("ui-btn-icon-right ui-icon-arrow-r");

                instanceHolder.append(
                    nextCourse.on("click", function () {
                        instanceHolder.hide();
                        instanceHolder.remove();
                        $this.renderIndividualCourse(courses[keys[index + 1]], index + 1);
                    })
                );
            }
            instanceHolder.enhanceWithin();
        },

        renderMultipleCourse: function (courses) {
            var $this = this;
            var multiHolder = $("<div/>").addClass("multi-holder");

            var headerInfo = {
                INFO_ONLY: true,
                TYPE: "header",
                DISPLAY: "Multiple " + enroller.options.course_terminology + " Bookings"
            };

            multiHolder.append(enroller._createInfoFieldDetailed("multi_header", headerInfo));

            $this.element.append(multiHolder);
            var keys = Object.keys(courses);

            $this.renderIndividualCourse(courses[keys[0]], 0);

            var planHolder = $("<div/>").addClass("ez-plan-inner");
            $this.element.append(planHolder);

            /*    for (var i = 0; i < keys.length; i++) {
                var courseID = keys[i];
                var instanceData = courses[courseID].instanceData;
                var instanceHolder = $("<div/>");
                var courseData = {
                    INSTANCEID: instanceData.INSTANCEID,
                    cost: instanceData.COST,
                    TYPE: instanceData.TYPE,
                    ID: instanceData.ID
                };
                multiHolder.append(instanceHolder);
                $this.renderCourseInfoBlock(instanceHolder, instanceData);
                $this.renderDiscounts(courseData, instanceHolder);
                $("#calculate_" + instanceData.INSTANCEID).trigger("click");
                instanceHolder.enhanceWithin();
            } */
        },

        _renderPaymentMethod: function () {
            var $this = this;
            var enrolOptions = $.extend(true, {}, enroller.options.enroller_steps.billing, {});
            var validMethods = $this.options.getPaymentMethods(enrolOptions, enroller.options.cost);
            if ($(".method-root").length > 0) {
                $(".method-root").remove();
            }

            if ($(".ez-total").length > 0) {
                $(".ez-total").remove();
            }

            if (
                $(".enroller-discount-block :visible").length < 1 &&
                $this.element.find(".total-holder").length < 1
            ) {
                var totalCost = enroller._createInformationField(
                    "Total " + enroller.options.cost_terminology,
                    enroller._currencyDisplayFormat(enroller.options.cost)
                );
                totalCost.addClass("ez-total");
                $(".enroller-discount-block").after(totalCost);
            }

            if (!$this.element.find("#paymentMethods_ez").length > 0) {
                if (validMethods.VALUES.length === 1) {
                    if (validMethods.VALUES[0].VALUE === "ezypay") {
                        $this._renderEzySection();
                    } else {
                        $this._renderNonEzySection(validMethods.VALUES[0].VALUE);
                    }
                } else {
                    var methodHolder = enroller._createInputField(
                        "paymentMethods_ez",
                        validMethods
                    );
                    methodHolder.addClass("method-root");
                    $(".ez-plan-inner").before(methodHolder);
                    $("#paymentMethods_ez").on("change", function (e) {
                        var method = $(this).val();

                        if (method === "ezypay") {
                            $this._renderEzySection();
                        } else {
                            $this._renderNonEzySection(method);
                        }
                    });
                }
            }
            enroller._displaySetupChosens("ezypay-plan");
        },
        _renderEzySection: function () {
            var $this = this;
            var holder = $this.element;
            var planHolder = holder.find(".ez-plan-inner");
            planHolder.empty();

            if ($this.options.renderRules) {
                var plans = $this.options.renderRules(planMethod, planHolder);
                planHolder.append(plans);

                /* $this.options.getRules(enroller.options.cost, planMethod, function(rules) {
                    $this.options.renderRules(rules, enroller.options.cost, holder, planMethod);
                }); */
            }
        },
        _renderNonEzySection: function (method) {
            var $this = this;
            var holder = $this.element;
            var planHolder = holder.find(".ez-plan-inner");
            planHolder.empty();
            if (method) {
                var nextStep = enroller._createInputField("nextStep_ez", {
                    DISPLAY: "Confirm Details",
                    TYPE: "button"
                });
                nextStep.find("a").addClass("ui-btn-icon-right ui-icon-arrow-r");

                planHolder.append(
                    nextStep.on("click", function () {
                        $this.options.lockPlanAndNextStep({
                            lock_payment_method: method
                        });
                    })
                );
            }
        },

        renderCourseInfoBlock: function (location, instanceData, index) {
            if (instanceData && location) {
                var target = $(location);
                var name = instanceData.NAME;
                if (index != null) {
                    name = enroller.options.course_terminology + " " + (index + 1) + ": " + name;
                }
                var blurbTest = enroller._createBlurb(name);
                target.append(blurbTest);
            }
        },
        renderDiscounts: function (course, location) {
            var $this = this;
            var holder = $(location);
            var instanceID = course.INSTANCEID;
            var courseID = course.ID || course.COURSEID;
            var courseType = course.TYPE;
            var discountBlock = enroller._reviewStepDiscountsBlock(
                holder,
                instanceID,
                courseID,
                courseType
            );

            $("#calculate_" + instanceID).on("click", function (e) {
                e.preventDefault();
                var concessions = enroller._getSelectedConcessions(
                    "#concessionList_" + instanceID,
                    "concessionHolder_" + instanceID
                );
                var cost = parseFloat(enroller.options.cost);
                if (enroller.options.original_cost != null) {
                    cost = parseFloat(enroller.options.original_cost);
                } else {
                    enroller.options.original_cost = cost;
                }

                if (course && course.cost != null) {
                    cost = course.cost;
                }

                var promoCode = $("#promoCode_" + instanceID).val();
                var discountParams = {
                    contactID: enroller.options.contact_id,
                    instanceID: instanceID,
                    type: courseType,
                    originalPrice: cost
                };
                if (promoCode) {
                    discountParams.promocode = promoCode;
                }

                if (concessions) {
                    discountParams.concessionDiscountIDs = concessions;
                } else {
                    discountParams.concessionDiscountIDs = 0;
                }
                $this.options.calculateDiscount(
                    discountParams,

                    function (discounts) {
                        enroller._displayOrUpdateDiscountDisplay(discounts, discountBlock);

                        if (discounts && discounts.REVISEDPRICE != null) {
                            enroller.options.cost = discounts.REVISEDPRICE;
                            enroller.options.discounts_applied = discounts.DISCOUNTSAPPLIED;

                            if (enroller.options.promo_code_by_course) {
                                if (enroller.options.promo_code_course) {
                                    enroller.options.promo_code_course[
                                        courseID + "_" + courseType
                                    ] = promoCode;
                                } else {
                                    enroller.options.promo_code_course = {
                                        [courseID + "_" + courseType]: promoCode
                                    };
                                }
                            } else {
                                enroller.options.promo_code = promoCode;
                            }
                            if (promoCode) {
                                enroller.options.lock_promo_code = true;
                            }
                        }
                        4;
                        if (promoCode && enroller.options.lock_promo_code) {
                            if ($("#reset_promo" + instanceID).length === 0) {
                                var resetPromo = enroller._createInputField(
                                    "reset_promo" + instanceID,
                                    {
                                        DISPLAY: "Reset Promo Code",
                                        TYPE: "button"
                                    }
                                );
                                resetPromo
                                    .find("a")
                                    .addClass(
                                        "ui-btn-icon-right ui-icon-back reset-promo ui-btn-wide"
                                    )
                                    .removeClass("ui-btn-active")
                                    .on("click", function () {
                                        enroller.options.lock_promo_code = false;
                                        enroller.options.promo_code = "";
                                        enroller.options.promo_code_course = null;
                                        enroller._changeStep("ezypay-plan");
                                    });
                                $("#promoCode_" + instanceID)
                                    .closest(".enroller-field-holder")
                                    .after(resetPromo);
                            }
                        } else if ($("#reset_promo" + instanceID).length > 0) {
                            $("#reset_promo" + instanceID)
                                .closest(".enroller-field-holder")
                                .remove();
                        }

                        $(location).enhanceWithin();
                        if (!$this.options.multiple_mode) {
                            $this._renderPaymentMethod();
                            //$this._renderEzySection();
                        } else {
                            $this.element.trigger("enroller:course_discount_displayed", {
                                discounts: discounts,
                                course: course
                            });
                        }
                    }
                );
            });
        },
        _renderContent: function () {
            var $this = this;
            var holder = $this.element;
            $this.element.empty();

            if ($this.options.BLURB_TOP != null && $this.options.BLURB_TOP != "") {
                var blurbT = enroller._createBlurb($this.options.BLURB_TOP);

                $(holder).prepend(blurbT);
            }

            if ($this.options.HEADER) {
                var headerInfo = {
                    INFO_ONLY: true,
                    TYPE: "header",
                    DISPLAY: $this.options.HEADER
                };
                $(holder).prepend(
                    enroller._createInfoFieldDetailed("ez-plan_step_header", headerInfo)
                );
            }

            // if we are in cart mode, multiple_courses is not populated.

            if (enroller.options.multiple_courses) {
                var total = 0;
                $.each(enroller.options.multiple_courses, function (contactID, instance) {
                    if (instance) {
                        $.each(instance, function (instanceID, enrolment) {
                            if (instanceID !== "CONTACT_NAME") {
                                total += 1;
                            }
                        });
                    }
                });
                if (total > 0) {
                    var planHolder = $("<div/>").addClass("ez-plan-inner");
                    holder.append(planHolder);
                    $this._renderPaymentMethod();
                    //$this._renderEzySection();

                    /*Bottom Blurb*/
                    if ($this.options.BLURB_BOTTOM != null && $this.options.BLURB_BOTTOM != "") {
                        var blurbB = enroller._createBlurb($this.options.BLURB_BOTTOM);
                        $(holder).append(blurbB);
                    }

                    return;
                }
            }
            var instanceData = enroller.element.data("selected_instance");

            if ($this.options.multiple_mode) {
                var courseList = enroller.options.cart_course_override;
                var dataFetched = $.extend(true, {}, courseList);
                var keys = Object.keys(dataFetched);

                function checkCompleted() {
                    var done = true;

                    for (var i = 0; i < keys.length; i++) {
                        var cID = keys[i];
                        if (dataFetched[cID].instanceData == null) {
                            done = false;
                        }
                    }
                    return done;
                }

                for (var index = 0; index < keys.length; index++) {
                    var courseID = keys[index]; // somehow this is not restricted to the loop

                    var courseInfo = dataFetched[courseID];

                    enroller._fetchAndUpdateInstanceData(
                        function (instanceData) {
                            var updatedInstanceData = enroller._modifyInstanceData(instanceData);

                            var cid =
                                updatedInstanceData.INSTANCEID + "_" + updatedInstanceData.TYPE;
                            dataFetched[cid].instanceData = updatedInstanceData;

                            if (checkCompleted()) {
                                $this.element.trigger("enroller:plan_multiple_instances", {
                                    courses: dataFetched
                                });
                            }
                        },
                        {
                            TYPE: courseInfo.course_type,
                            INSTANCEID: courseInfo.instance_id,
                            ID: courseInfo.course_id
                        }
                    );
                }
                return;
            }

            if (
                instanceData == null ||
                (instanceData !== null &&
                    instanceData.INSTANCEID !== enroller.options.course.INSTANCEID)
            ) {
                if (enroller.options.course.INSTANCEID > 0) {
                    enroller._fetchAndUpdateInstanceData(function (updatedInstanceData) {
                        updatedInstanceData = enroller._modifyInstanceData(updatedInstanceData);

                        enroller.element.data("selected_instance", updatedInstanceData);

                        enroller.options.cost = updatedInstanceData.COST;
                        $this._renderContent();
                    });
                }
            } else {
                // could move the course info retrieval into this step
                // then switch the instance selected in course between multiple, while building the total cost....
                $this.renderCourseInfoBlock(holder, instanceData);
                // Finally would call the ezypay part with the combined cost...
                //holder.hide();

                $this.renderDiscounts(enroller.options.course, holder);

                var planHolder = $("<div/>").addClass("ez-plan-inner");
                holder.append(planHolder);

                /*Bottom Blurb*/
                if ($this.options.BLURB_BOTTOM != null && $this.options.BLURB_BOTTOM != "") {
                    var blurbB = enroller._createBlurb($this.options.BLURB_BOTTOM);
                    $(holder).append(blurbB);
                }

                $("#calculate_" + enroller.options.course.INSTANCEID).trigger("click");
            }
        }
    });
});
