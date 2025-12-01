jQuery(function ($) {
    $.axWidget("axcelerate.render_cognito_login", {
        options: {
            motherShipDomain: "https://tst.axcelerate.com",
            motherShipPath: "/auth/user/login.cfm",
            providers: {
                google: {
                    buttonImage: "/images/loginproviders/google_logo.png",
                    identifier: "Google",
                    text: "Google"
                },
                apple: {
                    buttonImage: "/images/loginproviders/apple_logo.png",
                    identifier: "SignInWithApple",
                    text: "Apple"
                },
                facebook: {
                    buttonImage: "/images/loginproviders/facebook_logo.png",
                    identifier: "Facebook",
                    text: "Facebook"
                },
                axcelerate: {
                    buttonImage: "/images/loginproviders/axcelerate_logo.png",
                    identifier: "Axcelerate",
                    text: "aXcelerate"
                }
            },
            customProvider: null,
            renderTopBlurb: true,
            exclusiveMode: false,
            prefixText: "Continue with",
            containerWidth: 640
        },

        _create: function () {
            var $this = this;
            $this.renderContent();
        },
        renderContent: function () {
            var $this = this;
            /*  $this.element.append(
                $("<hr/>").css({
                    opacity: 0.5,
                    marginTop: 8
                })
            ); */
            var blurb = $("<span>Or log in/sign up with</span>");
            blurb.css({
                color: "#777",
                fontWeight: 600,
                fontSize: 12,
                marginBottom: 8
            });
            blurb.addClass("login-blurb");
            if ($this.options.renderTopBlurb) {
                $this.element.append(blurb);
            }

            var holder = $("<div></div>").addClass("login-holder");
            holder.css({
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-evenly",
                flexWrap: "wrap",
                marginTop: -12,
                width: $this.options.containerWidth,
                maxWidth: "100%"
            });

            $this.element.append(holder);
            if (!$this.options.exclusiveMode) {
                holder.append($this.createLoginOption("google"));
                holder.append($this.createLoginOption("apple"));
                holder.append($this.createLoginOption("facebook"));
                holder.append($this.createLoginOption("axcelerate"));
            }
            if ($this.options.customProvider) {
                holder.append($this.createLoginOption("custom"));
            }
            $this.renderBlurb();
        },
        getMotherShipUrl() {},

        renderBlurb: function () {
            var $this = this;
            var blurb = $("<span></span>").append("Login Powered by ");
            blurb.append(
                '<a href="https://axcelerate.com">aXcelerate Student Management System</a>'
            );
            blurb.addClass("login-blurb");
            blurb.css({
                color: "#777",
                fontWeight: 600,
                marginTop: 8,
                fontSize: 12
            });
            blurb.css({
                display: "block"
            });
            $this.element.append(blurb);
        },
        getDomainForProvider: function (provider) {
            var $this = this;
            var providerOpts = $this.options.providers[provider];
            if (provider === "custom") {
                providerOpts = $this.options.customProvider;
            }
            var domain =
                $this.options.motherShipDomain +
                $this.options.motherShipPath +
                "?return_to=" +
                encodeURIComponent(window.location.href);
            if (provider !== "axcelerate") {
                domain += "&provider=" + providerOpts.identifier;
            }
            return domain;
        },

        createLoginOption: function (provider) {
            var $this = this;
            var providerOpts = $this.options.providers[provider];
            if (provider === "custom") {
                providerOpts = $this.options.customProvider;
            }
            var jsFileLocation = $("script[src*=ax_cog_login]").attr("src");

            var index = jsFileLocation.indexOf("/ax_cog_login.js");
            var path = jsFileLocation.slice(0, index);
            if (providerOpts) {
                var image = $("<img>").attr("src", path + providerOpts.buttonImage);
                image.css({
                    height: 18,
                    width: "auto",
                    marginRight: 12
                });
                var loginButton = $("<a></a>").append(image);

                image.attr("alt", "Log in with" + provider);
                loginButton.addClass("ax-cog-button");
                var text = $("<span></span>").append(
                    $this.options.prefixText + " " + providerOpts.text
                );
                text.css({
                    lineHeight: "16px",
                    fontSize: "14px",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    color: "#20374B"
                });
                loginButton.append(text);

                loginButton.attr("href", $this.getDomainForProvider(provider));
                return loginButton;
            }
            return "";
        }
    });

    $.axWidget("axcelerate.render_cognito_logout", {
        options: {
            callLogout: null
        },
        _create: function () {
            var $this = this;
            $this.renderContent();
        },

        renderContent: function () {
            var $this = this;
            $this.element.append($this.createLogoutButton());
        },
        createLogoutButton: function () {
            var $this = this;

            var logoutButton = $("<a></a>");

            logoutButton.addClass("ax-cog-button");
            var text = $("<span></span>").append("Login with a different user");
            text.css({
                lineHeight: "16px",
                fontSize: "14px",
                fontWeight: 600,
                whiteSpace: "nowrap",
                color: "#20374B"
            });
            logoutButton.append(text);
            logoutButton.on("click", $this.options.callLogout);

            return logoutButton;
        }
    });
    $.axWidget("axcelerate.render_account_choice", {
        options: {
            accounts_list: [],
            access_code: "",
            onSelect: null,
            mode: "call"
        },
        _create: function () {
            var $this = this;
            $this.renderContent();
        },

        renderContent: function () {
            var $this = this;
            for (var i = 0; i < $this.options.accounts_list.length; i++) {
                var account = $this.options.accounts_list[i];
                var choice = $this.createChoice(account);
                $this.element.append(choice);
            }
        },
        createChoice: function (account) {
            var $this = this;

            var choiceButton = $("<a></a>");

            choiceButton.addClass("ax-cog-button");
            var text = $("<span></span>").append("Continue as " + account.NAME);
            if ($this.options.mode === "reload") {
                var urlVars = "uid=" + account.USERID + "&access_code=" + $this.options.access_code;
                choiceButton.attr(
                    "href",
                    location.href.indexOf("?") > -1
                        ? location.href + "&" + urlVars
                        : location.href + "?" + urlVars
                );
            }

            text.css({
                lineHeight: "16px",
                fontSize: "14px",
                fontWeight: 600,
                whiteSpace: "nowrap",
                color: "#20374B"
            });
            choiceButton.append(text);
            if ($this.options.mode !== "reload") {
                choiceButton.on("click", function () {
                    $this.options.onSelect({
                        access_code: $this.options.access_code,
                        user_id: account.USERID
                    });
                });
            }

            return choiceButton;
        }
    });
});
