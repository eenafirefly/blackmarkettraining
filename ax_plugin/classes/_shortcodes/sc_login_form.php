<?php

/*
 * --------------------------------------------*
 * Securing the plugin
 * --------------------------------------------
 */
defined('ABSPATH') or die('No script kiddies please!');

/* -------------------------------------------- */

if (!class_exists('AX_Login_Form')) {

    class AX_Login_Form
    {
        public function __construct()
        {
            add_shortcode('ax_login_form', 'AX_Login_Form::sc_login_form');
        }

        public static function sc_login_form($atts = array(), $content = null)
        {
            $default_stylesheet = plugins_url('/css/ax-standard.css', AXIP_PLUGIN_NAME);

            wp_register_script('ax_widget', plugins_url('/enrollerWidget/widget/ax_widget.js', AXIP_PLUGIN_NAME), array(
                'jquery',
            ), AXIP_PLUGIN_VERSION);
            wp_enqueue_script('ax_widget');

            wp_register_script('ax_cog_login', plugins_url('/enrollerWidget/widget/ax_cog_login.js', AXIP_PLUGIN_NAME), array(
                'jquery', 'ax_widget',
            ), AXIP_PLUGIN_VERSION);
            wp_enqueue_script('ax_cog_login');

            wp_register_script(
                'ax-login-form',
                plugins_url('js/sc_login_form.js', __FILE__),
                array('jquery', 'ax_cog_login', 'ax_widget'),
                AXIP_PLUGIN_VERSION
            );
            wp_enqueue_script('ax-login-form');

            wp_register_style('ax-standard', $default_stylesheet, array(), AXIP_PLUGIN_VERSION);
            wp_enqueue_style('ax-standard');

            $loginStatus = AX_Enrol_Widget_Shortcode::check_login_status();

            $cognito = get_option('ax_cognito_enabled', 'cognito_disabled');
            $Auth2 = ($cognito === 'v2_cognito');

            if (!$Auth2) {
                return self::renderLegacy();
            }

            $loggedIn = false;
            $args = shortcode_atts(
                array(
                    'custom_css' => '',
                    'class_to_add' => '',
                    'wrap_tag' => '',
                    "container_width" => '',

                ),
                $atts
            );
            $Server_Session = AX_Session_Security::startOrGrabServerSession();

            if (isset($Server_Session) && !empty($Server_Session['AXTOKEN'])) {
                $loggedIn = true;
            }
            $exclusive_cognito = get_option('ax_cognito_custom_exclusive', false);

            $customProvider = get_option('ax_cognito_custom_provider', false);

            $mothershipURL = AX_Mothership::get_mothership_domain_for_current_environment();

            $settings = array(
                'ajaxURL' => admin_url('admin-ajax.php'),
                'ax_mothership_url' => $mothershipURL,
                'logged_in' => $loggedIn,
                'login_status' => $loginStatus,
                'container_width' => $container_width,
                'exclusiveMode' => !empty($exclusive_cognito),
            );

            if ($Auth2 && !empty($customProvider)) {
                $settings['custom_provider'] = array(
                    "buttonImage" => "/images/loginproviders/corp_login.png",
                    'identifier' => $customProvider,
                    'short_name' => $customProvider,
                    'text' => get_option('ax_cognito_custom_provider_label', $customProvider),
                );
            }
            wp_localize_script('ax-login-form', 'login_vars', $settings);

            $currentURL = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";
            $nonce = wp_create_nonce('ax_login'); // add to _nonce field
            $nonceLC = wp_create_nonce('ax_login_create');

            $postURL = ""; //esc_url( admin_url( 'admin-post.php' ) );
            $html = '<div class="ax-login-outer">';
            $html .= '<div class="ax-cog-login-hold" ' . ($loggedIn ? 'style="display:none"' : '') . '>';

            $html .= '</div>';

            $html .= '<div class="ax-logout-form ax-form-standard" ' . ($loggedIn ? '' : 'style="display:none"') . '>';
            $html .= self::renderLogoutForm($nonce);
            $html .= '</div>';
            $html .= '</div>';
            return $html;

        }

        public static function renderLegacy()
        {
            $html = '';
            $loginForm = true;
            $args = shortcode_atts(
                array(
                    'custom_css' => '',
                    'class_to_add' => '',
                    'wrap_tag' => '',
                    "container_width" => '',
                ),
                $atts
            );
            $Server_Session = AX_Session_Security::startOrGrabServerSession();

            if (isset($Server_Session) && !empty($Server_Session['AXTOKEN'])) {
                $loggedIn = true;
            }

            $settings = array(
                'ajaxURL' => admin_url('admin-ajax.php'),
                'container_width' => $container_width,
            );

            wp_localize_script('ax-login-form', 'login_vars', $settings);

            $nonce = wp_create_nonce('ax_login'); // add to _nonce field
            $nonceLC = wp_create_nonce('ax_login_create');

            $postURL = ""; //esc_url( admin_url( 'admin-post.php' ) );
            $html = '<div class="ax-login-form ax-form-standard" ' . ($loginForm ? '' : 'style="display:none"') . '>';
            $html .= self::renderLoginForm($nonce, $postURL);
            $html .= '</div>';

            $html .= '<div class="ax-login-forgot-form ax-form-standard" style="display:none">';
            $html .= self::renderForgotForm($nonce);
            $html .= '</div>';

            $html .= '<div class="ax-login-create-form ax-form-standard" style="display:none">';
            $html .= self::renderCreateForm($nonceLC, $postURL);
            $html .= '</div>';

            $html .= '<div class="ax-logout-form ax-form-standard" ' . (!$loginForm ? '' : 'style="display:none"') . '>';
            $html .= self::renderLogoutForm($nonce);
            $html .= '</div>';
            return $html;

        }

        public static function renderLoginForm($nonce, $postURL = "")
        {

            $html = '<form action="' . $postURL . '" method="post" class="ax_login_form">';
            $html .= '<input type="hidden" name="action" value="ax_login">';
            $html .= '<input name="_nonce" type="hidden" value="' . $nonce . '">';
            $html .= '<p><label for="username">Username:</label><input type="text" name="username" required/></p>';
            $html .= '<p><label for="password">Password:</label><input type="password" name="password" required autocomplete="current-password"/></p>';
            $html .= '<div class="input-group right">';
            $html .= '<button type="button" class="btn button btn-outline-secondary ax-forgot" value="forgot">Forgot Password</button>';
            $html .= '<button type="button" class="btn button btn-outline-secondary ax-create" value="create">Create Account</button>';
            $html .= '<button type="submit" class="btn button button-primary" value="Submit Form">Login</button>';
            $html .= '</div></form>';
            return $html;
        }

        public static function renderForgotForm($nonce)
        {
            $html = '<form action="" method="post" class="ax_login_forgot_form">';
            $html .= '<input name="_nonce" type="hidden" value="' . $nonce . '">';
            $html .= '<input type="hidden" name="action" value="ax_forgot">';
            $html .= '<p><label for="username">Username:</label><input type="text" name="username" required/></p>';
            $html .= '<p><label for="email_address">Email Address:</label><input type="email" name="email_address" required pattern="^([a-zA-Z0-9]+[a-zA-Z0-9._%\-\+]*@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,4})$"/></p>';
            $html .= '<div class="input-group right">';
            $html .= '<button type="button" class="btn button btn-outline-secondary ax-login" value="login">User Login</button>';
            $html .= '<button type="submit"  class="btn button button-primary" value="Submit Form">Forgot Password</button>';
            $html .= '</div>';

            $html .= '</form>';
            return $html;
        }
        public static function renderCreateForm($nonceLC)
        {

            $html = '<form action="" method="post" class="ax_login_create_form">';
            $html .= '<input name="_nonce_lc" type="hidden" value="' . $nonceLC . '">';
            $html .= '<input type="hidden" name="action" value="ax_new_contact_user">';
            $html .= '<p><label for="given_name">Given Name:</label><input type="text" name="given_name" required/></p>';
            $html .= '<p><label for="surname">Surname:</label><input type="text" name="surname" required/></p>';
            $html .= '<p><label for="email_address">Email Address:</label><input type="email" name="email_address" required pattern="^([a-zA-Z0-9]+[a-zA-Z0-9._%\-\+]*@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,4})$"/></p>';

            $html .= '<p><label for="password">Password:</label><input type="password" name="password" title="6 Characters, must have at least one lowercase, one uppercase and one number." required pattern="^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,30}$" /></p>';
            $html .= '<p><label for="password_verify">Verify Password:</label><input type="password" name="password_verify" required/></p>';

            $html .= '<div class="input-group right">';
            $html .= '<button type="button" class="btn button btn-outline-secondary ax-login" value="login">User Login</button>';
            $html .= '<button type="submit"  class="btn button button-primary" value="Submit Form">Create Account</button>';
            $html .= '</div></form>';
            return $html;
        }

        public static function renderLogoutForm($nonce)
        {
            $html = '<form action="" method="post" class="ax_logout_form">';
            $html .= '<input type="hidden" name="action" value="ax_logout">';
            $html .= '<input name="_nonce" type="hidden" value="' . $nonce . '">';

            $html .= '<button type="submit"   class="btn button button-primary"  value="Submit Form">Logout</button></form>';
            return $html;
        }
    }

    $AX_Login_Form = new AX_Login_Form();

    if (class_exists('WPBakeryShortCode') && class_exists('AX_VC_PARAMS') && class_exists('WPBakeryShortCodesContainer')) {
        vc_map(array(
            "name" => __("aX Login form", "axcelerate"),
            "base" => "ax_login_form",
            "icon" => plugin_dir_url(AXIP_PLUGIN_NAME) . 'images/ax_icon.png',
            "content_element" => true,
            "description" => __("Login Form", "axcelerate"),
            "show_settings_on_create" => true,
            "is_container" => false,
            "as_parent" => array('only' => ''),

            "category" => array(
                'aX Parent Codes',
                'Content',
            ),
            'params' => array(),
        ));
        class WPBakeryShortCode_aX_Login_Form extends WPBakeryShortCode
        {
        }
    }
}
