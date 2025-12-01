<?php

/*
 * --------------------------------------------*
 * Securing the plugin
 * --------------------------------------------
 */
defined('ABSPATH') or die('No script kiddies please!');

/* -------------------------------------------- */
class AX_Settings_Tab_Legacy
{
    const general_settings_key = 'axip_general_settings';
    public function __construct()
    {
    }
    public function register_settings()
    {

        /* preload settings */
        $this->load_settings();

        add_option(self::general_settings_key, array(), '', false);
        register_setting(self::general_settings_key, self::general_settings_key);

        add_settings_section('section_general', __('Axcelerate Integration Plugin Settings', 'axip'), array(
            &$this,
            'section_general_desc',
        ), self::general_settings_key);

        add_settings_field('webservice_base_path', __('Environment / API URL:', 'axip'), array(
            &$this,
            'field_webservice_base_path',
        ), self::general_settings_key, 'section_general');

        add_option('ax_sharding_override', '', '', false);
        register_setting(self::general_settings_key, 'ax_sharding_override');
        add_settings_field('ax_sharding_override', __('Override Sharding Domains :', 'axip'), array(
            &$this,
            'field_ax_sharding_override',
        ), self::general_settings_key, 'section_general');

        add_settings_field('api_token', __('API Token:', 'axip'), array(
            &$this,
            'field_api_token',
        ), self::general_settings_key, 'section_general');
        add_settings_field('webservice_token', __('Webservice Token:', 'axip'), array(
            &$this,
            'field_webservice_token',
        ), self::general_settings_key, 'section_general');

        add_settings_field('custom_css', __('Custom css:', 'axip'), array(
            &$this,
            'field_custom_css',
        ), self::general_settings_key, 'section_general');

        add_option('ax_global_login', '', '', false);
        register_setting(self::general_settings_key, 'ax_global_login');
        add_settings_field('ax_global_login', __('Global User Login :', 'axip'), array(
            &$this,
            'field_ax_global_login',
        ), self::general_settings_key, 'section_general');

        add_option('ax_grant_ct_enrol', '', '', false);
        register_setting(self::general_settings_key, 'ax_grant_ct_enrol');
        add_settings_field('ax_grant_ct_enrol', __('Grant CT on Enrol :', 'axip'), array(
            &$this,
            'field_grant_ct_on_enrol',
        ), self::general_settings_key, 'section_general');

        /**** LEGACY SETTINGS ****/
        add_settings_section('section_legacy', __('Legacy Settings', 'axip'), array(
            &$this,
            'section_legacy_desc',
        ), self::general_settings_key);

        /*
         */

        add_option('axip_load_legacy', false, '', false);
        register_setting(self::general_settings_key, 'axip_load_legacy');

        add_settings_field('axip_load_legacy', __('Load Legacy Scripts:', 'axip'), array(
            &$this,
            'field_load_legacy_scripts',
        ), self::general_settings_key, 'section_legacy');

        /*
         */

        add_settings_field('axip_training_organisation', __('Training Organisation:', 'axip'), array(
            &$this,
            'field_training_organisation',
        ), self::general_settings_key, 'section_legacy');
        add_settings_field('payment_options', __('Online Payment options:', 'axip'), array(
            &$this,
            'field_payment_options',
        ), self::general_settings_key, 'section_legacy');
        add_settings_field('axip_discounts_available', __('Enable Discounting:', 'axip'), array(
            &$this,
            'field_discounts_available',
        ), self::general_settings_key, 'section_legacy');
        add_settings_field('axip_card_types', __('Card Types:', 'axip'), array(
            &$this,
            'field_card_types',
        ), self::general_settings_key, 'section_legacy');

        /*
     * add_settings_field( 'axip_load_less',__('Load Legacy Enroller CSS:','axip') , array( &$this, 'field_load_less' ), self::general_settings_key, 'section_general' );
     * add_settings_field( 'invoice_payment_url',__('Invoice payment url:','axip') , array( &$this, 'field_invoice_payment_url' ), self::general_settings_key, 'section_general' );
     *
     */

    }

    /*
     * Loads both the general and advanced settings from
     * the database into their respective arrays. Uses
     * array_merge to merge with default values if they're
     * missing.
     */
    public function load_settings()
    {
        $this->general_settings = (array) get_option(self::general_settings_key);

        // there is a problem with the array below....i believe it needs some more work below that is currently missing, unsure where it came from. Wade 29th Sep 2015.
        // $this->search_settings = (array) get_option( $this->search_settings_key );

        // Merge with defaults
        $this->general_settings = array_merge(array(

            'general_option' => 'General value',
        ), $this->general_settings);

    }

    /*
     * =================== General Settings==================
     */

    public function section_legacy_desc()
    {
        echo '<h4>Setings for Legacy aX-Page integrations. Not used for the Enrolment Widget</h4>';
        echo '<hr>';
    }

    public function field_ax_sharding_override()
    {
        $optVal = get_option('ax_sharding_override', 0);

        $options = array(
            0 => "Sharding Allowed",
            1 => "Sharding Disabled",
        );
        echo '<select name="ax_sharding_override">';
        foreach ($options as $key => $value) {
            if ($key == $optVal) {
                echo '<option value="' . $key . '" selected="selected">' . $value . '</option>';
            } else {
                echo '<option value="' . $key . '">' . $value . '</option>';
            }
        }
        echo '</select>';
        echo '<p><em>Prevents sharding URLs from being used, and defaults back to standard domains for environments.</em></p>';
    }

    public function field_ax_global_login()
    {
        $optVal = get_option('ax_global_login', 0);

        $options = array(
            0 => "Disabled",
            1 => "Enabled",
        );
        echo '<select name="ax_global_login">';
        foreach ($options as $key => $value) {
            if ($key == $optVal) {
                echo '<option value="' . $key . '" selected="selected">' . $value . '</option>';
            } else {
                echo '<option value="' . $key . '">' . $value . '</option>';
            }
        }
        echo '</select>';
        echo '<p><em>Whenever a user logs in, keep track of their session.</em></p>';
    }

    public function field_grant_ct_on_enrol()
    {
        $optVal = get_option('ax_grant_ct_enrol', 0);

        $options = array(
            0 => "Disabled",
            1 => "Enabled",
        );
        echo '<select name="ax_grant_ct_enrol">';
        foreach ($options as $key => $value) {
            if ($key == $optVal) {
                echo '<option value="' . $key . '" selected="selected">' . $value . '</option>';
            } else {
                echo '<option value="' . $key . '">' . $value . '</option>';
            }
        }
        echo '</select>';
        echo '<p><em>Check for and grant Credit Transfers to units on enrolment.</em></p>';
    }

    public function field_load_legacy_scripts()
    {
        $optVal = get_option('axip_load_legacy', 0);

        $options = array(
            0 => "Do Not Load Scripts",
            1 => "Load Scripts",
        );
        echo '<select name="axip_load_legacy">';
        foreach ($options as $key => $value) {
            if ($key == $optVal) {
                echo '<option value="' . $key . '" selected="selected">' . $value . '</option>';
            } else {
                echo '<option value="' . $key . '">' . $value . '</option>';
            }
        }
        echo '</select>';

    }

    /*
     * General Option field callback, renders a
     * text input, note the name and value.
     */
    public function field_webservice_base_path()
    {

        AX_Database::set_transient('ax_check_cognito', false, 1, 'other');

        // Check the App Register
        AX_Database::set_transient('ax_app_register_check', false, 1, 'other');

        // Check the Shard URL
        AX_Validate::validateAccess();

        $AxcelerateAPI = new AxcelerateAPI();

        wp_enqueue_script('ax-setting-helper', plugins_url('../../js/ax_setting_helper.js', __FILE__), array(
            'jquery',
            'chosen',
            'wp-color-picker',
        ), '', true);
        $sharding = get_option('ax_sharding_enabled', false);
        $nonce = wp_create_nonce('ax_enroller');
        echo '<script>window._wp_nonce = "' . $nonce . '";</script>';

        wp_localize_script('ax-setting-helper', 'settings_vars', array(
            'ajaxURL' => admin_url('admin-ajax.php'),
            'sharding' => $sharding,

        ));

        $optVal = $this->general_settings['webservice_base_path'];
        $optActive = !empty($optVal);

        if (!$optActive) {
            $optVal = "https://stg.axcelerate.com/api/";
        }

        $options = array(
            "custom_domain" => "Custom Domain",
            "https://app.axcelerate.com/api/" => "Production",
            "https://stg.axcelerate.com/api/" => "Staging",
            "https://tst.axcelerate.com/api/" => "Testing",

        );
        $environment = get_option('ax_environment', 'unset');
        echo '<select style="min-width: 30em;" name="domain_helper" id="domain_helper">';
        $found = false;
        foreach ($options as $key => $value) {
            if ($key == $optVal) {
                $found = true;
                switch ($key) {
                    case 'https://app.axcelerate.com/api/':
                        $environment = 'PRODUCTION';
                        break;
                    case 'https://stg.axcelerate.com/api/':

                        $environment = 'STAGING';
                        break;
                    case 'https://tst.axcelerate.com/api/':

                        $environment = 'TESTING';
                        break;
                    default:

                        break;

                }

                echo '<option value="' . $key . '" selected="selected">' . $value . '</option>';
            } else {
                echo '<option value="' . $key . '">' . $value . '</option>';
            }
        }

        if (!$found) {
            $environment = 'unset';
        }

        $hasShard = !empty(get_option('ax_shard_subdomain', ''));

        update_option('ax_environment', $environment, false);

        echo '</select>';

        echo '<input id="webservice_path" type="text" style="min-width: 30em; display:' . (!$found ? 'block' : 'none') . ';" name="' . self::general_settings_key . '[webservice_base_path]" value="' . $optVal . '"/>';

        echo '<div id="shard_domain" style="display: ' . ($hasShard ? 'block' : 'none') . ';" >';
        echo '<br/><em>A Subdomain has been found for this account, and will be used for the Webservice URL, based on the environment chosen.</em>';
        echo '<br/><em>The Url used will be:</em> <span id="webservice_url">' . $AxcelerateAPI->get_domain_for_environment($sharding, $environment) . '</span>';
        echo '<br/><em>The subdomain found is:</em> <span id="webservice_url">' . get_option('ax_shard_subdomain', '') . '</span>';

        echo '</div>';

    }
    public function field_api_token()
    {
        ?>
<input type="text" style="min-width: 30em;"
	name="<?php echo self::general_settings_key; ?>[api_token]"
	value="<?php echo (isset($this->general_settings['api_token']) ? esc_attr($this->general_settings['api_token']) : ''); ?>" />
<?php

    }
    public function field_webservice_token()
    {
        ?>
			<input type="text" style="min-width: 30em;"
			name="<?php echo self::general_settings_key; ?>[webservice_token]" value="<?php echo (isset($this->general_settings['webservice_token']) ? esc_attr($this->general_settings['webservice_token']) : ''); ?>" />
		<?php
echo '<p><em>Save settings before testing.</em></p>';
        echo '<a class="button btn" id="ax_test_connection">Test Connection</a>';
    }
    public function field_training_organisation()
    {
        ?>
<input type="text" style="min-width: 20em;"
	name="<?php echo self::general_settings_key; ?>[axip_training_organisation]"
	value="<?php echo (isset($this->general_settings['axip_training_organisation']) ? esc_attr($this->general_settings['axip_training_organisation']) : ''); ?>" />
<?php

    }
    public function field_discounts_available()
    {
        $discounts_options = array(
            "0" => "No discounts",
            "1" => "Discounts Enabled",
        );

        $axip_discounts_option = (isset($this->general_settings['axip_discounts_available']) ? esc_attr($this->general_settings['axip_discounts_available']) : '');

        ?>
<select
	name="<?php echo self::general_settings_key; ?>[axip_discounts_available]">
			<?php
foreach ($discounts_options as $key => $value) {
            ?>
				<option value="<?php echo $key; ?>"
		<?php echo ($axip_discounts_option == $key ? 'selected="selected"' : ''); ?>><?php echo $value; ?></option>
			<?php

        }
        ?>
			</select>

<?php

    }
    public function field_load_less()
    {

        /*
     * $load_less_options = array(
     * "false"=>"Do not Load",
     * "true"=>"Load CSS",
     * );
     *
     * $load_less_option = (isset($this->general_settings['axip_load_less'])?esc_attr($this->general_settings['axip_load_less']):'true');
     *
     * ?>
     * <select name="<?php echo self::general_settings_key; ?>[axip_load_less]">
     * <?php
     * foreach($load_less_options as $key=>$value) {
     * ?>
     * <option value="<?php echo $key; ?>" <?php echo ($load_less_option ==$key?'selected="selected"':'');?> ><?php echo $value; ?></option>
     * <?php
     *
     * }
     * ?>
     * </select>
     *
     * <?php
     */
    }
    public function field_card_types()
    {
        $card_options = array(
            "0" => "Mastercard, Visa",
            "1" => "Mastercard, Visa, AMEX",
        );

        $axip_card_options = (isset($this->general_settings['axip_card_types']) ? esc_attr($this->general_settings['axip_card_types']) : '');

        ?>
<select
	name="<?php echo self::general_settings_key; ?>[axip_card_types]">
				<?php
foreach ($card_options as $key => $value) {
            ?>
					<option value="<?php echo $key; ?>"
		<?php echo ($axip_card_options == $key ? 'selected="selected"' : ''); ?>><?php echo $value; ?></option>
				<?php

        }
        ?>
				</select>

<?php

    }
    public function field_payment_options()
    {
        $payment_options = array(
            "none" => "No online bookings",
            "invoice" => "Online bookings - invoice student",
            "payment" => "Online bookings - online payments",
            "both" => "Online bookings - invoice and online payment",
            "free" => "Online bookings - free",
        );

        $payment_option = (isset($this->general_settings['payment_options']) ? esc_attr($this->general_settings['payment_options']) : '');

        ?>
<select
	name="<?php echo self::general_settings_key; ?>[payment_options]">
		<?php
foreach ($payment_options as $key => $value) {
            ?>
			<option value="<?php echo $key; ?>"
		<?php echo ($payment_option == $key ? 'selected="selected"' : ''); ?>><?php echo $value; ?></option>
		<?php

        }
        ?>
		</select>

<?php

    }
    public function field_custom_css()
    {
        $custom_css = (isset($this->general_settings['custom_css']) ? esc_attr($this->general_settings['custom_css']) : '');

        ?>

<textarea name="<?php echo self::general_settings_key; ?>[custom_css]"
	cols="60" rows="10"><?php echo $custom_css; ?></textarea>

<?php

    }
    public function field_invoice_payment_url()
    {
        ?>
			<input type="text" name="<?php echo $this->general_settings_key; ?>[invoice_payment_url]" value="<?php echo (isset($this->general_settings['invoice_payment_url']) ? esc_attr($this->general_settings['invoice_payment_url']) : ''); ?>" />
			<?php

    }
    public function section_general_desc()
    {
        echo '<em>Add your credentials below to configure your connection to aXcelerate</em>';
        echo '<br/>';
        echo '<br/>';
        if (get_option('ax_recorded_site_url_error', false)) {
            echo '<div>Could not register the site URL in the Applications Register. You may have to add the site url manually. It can be found in the Settings -> Web & Other Integrations section within aXcelerate.</div>';
        } else {
            echo '<div>Site address registered with aXcelerate as:
            <strong>' . get_option('ax_recorded_site_url', '') . '</strong>
        </div>';
            echo '<em>This will periodically be sent to aXcelerate to be stored in the Applications Register</em>';

        }

    }
}
