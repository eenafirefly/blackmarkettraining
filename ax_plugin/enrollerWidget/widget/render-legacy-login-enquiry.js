function displayLegacyLoginEnquiry() {
    var contact_create_only = enroller.options.contact_create_only;
    if (enroller.options.login_or_create) {
        var modeSwitchHolder = jQuery('<div data-role="controlgroup" data-type="horizontal" />');
        modeSwitchHolder.append(
            jQuery(
                '<a class="enroller-login-switch ui-btn ui-btn-icon-right ui-alt-icon ui-nodisc-icon ui-icon-plus ui-btn-active enroller-create-contact" data-mode="contact">New ' +
                    enroller.options.terminology_student +
                    "</a>"
            ).data("mode", "contact")
        );
        modeSwitchHolder.append(
            jQuery(
                '<a class="enroller-login-switch ui-btn ui-btn-icon-right ui-alt-icon ui-nodisc-icon ui-icon-user ">Returning ' +
                    enroller.options.terminology_student +
                    "</a>"
            ).data("mode", "login")
        );

        jQuery("#userLogin_step").append(modeSwitchHolder);
        modeSwitchHolder.on("click", "a", function (e) {
            var element = jQuery(this);
            if (element.data("mode") == "contact") {
                jQuery("#userLogin_step #loginForm").hide();
                jQuery("#userLogin_step #forgotPassHolder").hide();
                jQuery("#userLogin_step #contactForm").show();
                var contactCreate = enroller._displayContactCreate(function (contactBasicDetails) {
                    enroller._setOption("contact_id", contactBasicDetails.CONTACTID);
                    enroller._setOption("payer_id", contactBasicDetails.CONTACTID);
                    enroller.options.user_contact_id = contactBasicDetails.CONTACTID;
                    enroller.element.trigger("enroller:user_contact_set", {
                        user_contact_id: enroller.options.user_contact_id
                    });
                });
                jQuery("#userLogin_step #contactForm").append(contactCreate);
                contactCreate
                    .find(".enroller-create-contact-button")
                    .addClass("ui-btn enroller-save-button ui-btn-active");
                contactCreate.enhanceWithin();
                contactCreate.show();
            } else if (element.data("mode") == "login") {
                jQuery("#userLogin_step #contactForm").hide();
                jQuery("#userLogin_step #forgotPassHolder").hide();
                jQuery("#userLogin_step #loginForm").show();
            }
            modeSwitchHolder.find(".ui-btn-active").removeClass("ui-btn-active");
            element.addClass("ui-btn-active");
        });
        modeSwitchHolder.controlgroup();

        var contactCreateHolder = jQuery('<form id="contactForm" />');
        jQuery("#userLogin_step").append(contactCreateHolder);
    }

    var fields = {
        USERNAME: {
            DISPLAY: "Username",
            TYPE: "text",
            REQUIRED: "required",
            MAXLENGTH: 100
        },
        PASSWORD: { DISPLAY: "Password", TYPE: "password", REQUIRED: "required" }
    };

    var inputHolder = jQuery('<form id="loginForm" />');
    jQuery("#userLogin_step").append(inputHolder);

    jQuery.each(fields, function (key, field) {
        var fieldHolder = enroller._createInputField(key, field);

        inputHolder.append(fieldHolder);
    });
    var loginHolder = enroller._createInformationField("Login", "");
    loginHolder.find("div.enroller-text-field").remove();
    loginHolder
        .find("div.enroller-field-label")
        .text("")
        .css("background", "transparent")
        .css("border", "none");

    var loginButton = jQuery(
        '<button class="enroller-save-button ui-btn ui-btn-active" type="submit" name="submit" data-role="button">Login</button>'
    );
    if (enroller.options.enquiry_single_click == true) {
        loginHolder.css("display", "none");
    }
    loginHolder.append(loginButton);
    inputHolder.append(loginHolder);
    loginButton.on("click", function () {
        enroller._checkStatusAndBuildParams(fields, function (params, requiredComplete, complete) {
            if (requiredComplete) {
                if (enroller.options.user_login != null) {
                    enroller.options.user_login(params, function (userData) {
                        if (userData.STATUS == null) {
                            enroller._alert("An Error occurred on Login, Please try again.");
                            if (enroller.options.enquiry_single_click) {
                                jQuery("#enquiry_complete_step button").attr("disabled", false);
                            }
                        } else {
                            if (userData.STATUS == "success") {
                                enroller._setUserRoleAndAccess(userData);
                            } else {
                                enroller._alert(enroller._messageReWrite(userData.MESSAGE));
                                if (enroller.options.enquiry_single_click) {
                                    jQuery("#enquiry_complete_step button").attr("disabled", false);
                                }
                            }
                        }
                    });
                } else {
                    enroller._alert("An Error occurred on Login, Please try again.");
                    if (enroller.options.enquiry_single_click) {
                        jQuery("#enquiry_complete_step button").attr("disabled", false);
                    }
                }
            }
        });
    });
    var forgotHolder = enroller._createInformationField("Forgot Password", "");
    forgotHolder.find("div.enroller-text-field").remove();
    forgotHolder
        .find("div.enroller-field-label")
        .text("")
        .css("background", "transparent")
        .css("border", "none");

    var forgotButton = jQuery(
        '<button class="enroller-save-button ui-btn" data-role="button" type="button">Forgot Password</button>'
    );
    forgotHolder.append(forgotButton);
    inputHolder.append(forgotHolder);
    forgotButton.on("click", function () {
        jQuery("#userLogin_step #forgotPassHolder").show();
        jQuery("#userLogin_step #loginForm").hide();
    });
    var forgotPassHolder = jQuery('<form id="forgotPassHolder" />');
    jQuery("#userLogin_step").append(forgotPassHolder);
    forgotPassHolder.hide();

    var fieldsFPW = {
        RESET_UNAME: { DISPLAY: "Username", TYPE: "text", REQUIRED: "required" },
        RESET_EMAIL: { DISPLAY: "Email Address", TYPE: "email", REQUIRED: "required" }
    };
    jQuery.each(fieldsFPW, function (key, field) {
        var fieldHolder = enroller._createInputField(key, field);

        forgotPassHolder.append(fieldHolder);
    });

    var resetHolder = enroller._createInformationField("Reset Password", "");
    resetHolder.find("div.enroller-text-field").remove();
    resetHolder
        .find("div.enroller-field-label")
        .text("")
        .css("background", "transparent")
        .css("border", "none");

    var resetButton = jQuery(
        '<button class="enroller-save-button ui-btn-active ui-btn" type="submit" name="submit" data-role="button">Reset Password</button>'
    );
    resetHolder.append(resetButton);
    forgotPassHolder.append(resetHolder);

    resetButton.on("click", function (e) {
        e.preventDefault();
        enroller._checkStatusAndBuildParams(
            fieldsFPW,
            function (params, requiredComplete, complete) {
                if (requiredComplete) {
                    if (enroller.options.user_reset != null) {
                        var newParams = {};
                        newParams.USERNAME = params.RESET_UNAME;
                        newParams.EMAIL = params.RESET_EMAIL;

                        enroller.options.user_reset(newParams, function (resetData) {
                            if (resetData.STATUS == null) {
                                if (resetData.ERROR == true) {
                                    if (resetData.DETAILS != null) {
                                        enroller._alert(
                                            "An error occurred on reset, please check your details and try again.<br/><br/>" +
                                                resetData.DETAILS
                                        );
                                    }
                                } else {
                                    enroller._alert(
                                        "An error occurred on reset, please check your details and try again."
                                    );
                                }
                            } else {
                                if (resetData.STATUS == "success") {
                                    enroller._alert(
                                        "Your password has been reset, you will receive an email with instructions for updating your password."
                                    );
                                    jQuery(
                                        "#userLogin_step .enroller-login-switch.ui-icon-user"
                                    ).trigger("click");
                                } else {
                                    enroller._alert(resetData.MSG);
                                }
                            }
                        });
                    } else {
                        enroller._alert(
                            "An error occurred on reset, please check your details and try again."
                        );
                    }
                }
            }
        );
        return false;
    });
    inputHolder.on("keyup keypress", function (e) {
        var keyCode = e.keyCode || e.which;
        if (keyCode === 13) {
            if (enroller.options.enquiry_single_click != true) {
                loginButton.trigger("click");
            }
            e.preventDefault();
            return false;
        }
    });

    if (!contact_create_only) {
        console.log("hiding contact create");
        contactCreateHolder.hide();
    } else {
        jQuery("#userLogin_step #loginForm").hide();
        jQuery("#userLogin_step #forgotPassHolder").hide();
        modeSwitchHolder.find("a.enroller-create-contact").trigger("click");
        modeSwitchHolder.hide();
    }

    var stepOptions = enroller.options.enroller_steps.userLogin;
    /*Top Blurb*/
    if (stepOptions.BLURB_TOP != null) {
        var blurbT = enroller._createBlurb(stepOptions.BLURB_TOP);

        jQuery("#userLogin_step").prepend(blurbT);
    }

    /*Bottom Blurb*/
    if (stepOptions.BLURB_BOTTOM != null) {
        var blurbB = enroller._createBlurb(stepOptions.BLURB_BOTTOM);
        jQuery("#userLogin_step").append(blurbB);
    }
    modeSwitchHolder.find("a.enroller-create-contact").trigger("click");
}
