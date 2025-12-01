<?php

/*
 * --------------------------------------------*
 * Securing the plugin
 * --------------------------------------------
 */
defined('ABSPATH') or die('No script kiddies please!');

/* -------------------------------------------- */
class AX_Settings_Tab_Enrolment_Info_Capture
{
    private $enroller_enrolment_info_capture_settings_key = 'axip_enroller_info_capture_settings';
    const enroller_enrolment_info_capture_settings_key = 'axip_enroller_info_capture_settings';
    public function __construct()
    {
    }
    public function register_settings()
    {
        /*
         * Description
         */
        add_settings_section('section_enrolment_info_capture', __('Enrolment Info Capture', 'axip'), array(
            &$this,
            'section_enrolment_info_capture',
        ), self::enroller_enrolment_info_capture_settings_key);

        /*
         * Enable Setting
         */
        add_option('ax_enrolment_info_capture_active', false, '', false);
        register_setting(self::enroller_enrolment_info_capture_settings_key, 'ax_enrolment_info_capture_active');
        add_settings_field('ax_enrolment_info_capture_active', __('Enable Enrolment Info Capture:', 'axip'), array(
            &$this,
            'field_enrolment_info_capture_active',
        ), self::enroller_enrolment_info_capture_settings_key, 'section_enrolment_info_capture');

        /*
         * Template
         */
        add_option('ax_enrolment_info_capture_template_id_p', false, '', false);
        register_setting(self::enroller_enrolment_info_capture_settings_key, 'ax_enrolment_info_capture_template_id_p', array(
            &$this,
            'sanitize_parse_number',
        ));

        add_settings_field('ax_enrolment_info_capture_template_id_p', __('Class Enrolment Info Capture Template:', 'axip'), array(
            &$this,
            'field_enrolment_info_capture_template_id_p',
        ), self::enroller_enrolment_info_capture_settings_key, 'section_enrolment_info_capture');

        /*
         * Template
         */
        add_option('ax_enrolment_info_capture_template_id_w', false, '', false);
        register_setting(self::enroller_enrolment_info_capture_settings_key, 'ax_enrolment_info_capture_template_id_w', array(
            &$this,
            'sanitize_parse_number',
        ));

        add_settings_field('ax_enrolment_info_capture_template_id_w', __('Workshop Enrolment Info Capture Template:', 'axip'), array(
            &$this,
            'field_enrolment_info_capture_template_id_w',
        ), self::enroller_enrolment_info_capture_settings_key, 'section_enrolment_info_capture');

        /*
         * Portfolio Type
         */
        add_option('ax_enrolment_info_capture_portfolio_type_id', false, '', false);
        register_setting(self::enroller_enrolment_info_capture_settings_key, 'ax_enrolment_info_capture_portfolio_type_id', array(
            &$this,
            'sanitize_parse_number',
        ));

        add_settings_field('ax_enrolment_info_capture_portfolio_type_id', __('Enrolment Info Capture Portfolio Type:', 'axip'), array(
            &$this,
            'field_enrolment_info_capture_portfolio_type_id',
        ), self::enroller_enrolment_info_capture_settings_key, 'section_enrolment_info_capture');

    }

    public function section_enrolment_info_capture()
    {
        echo "<p>Enabling Enrolment Info Capture will save a snapshot of the student's information entered at the time of enrolment.</p>";
        echo "<p>This information will be stored as a Enrolment Document that is saved against the student's Portfolio in aXcelerate and linked to their class enrolment.</p>";
        echo "<p>For workshop enrolments, the portfolio document will still be created but not be linked to the enrolment.</p>";
    }

    public function field_enrolment_info_capture_active()
    {
        $infoCaptureVal = get_option('ax_enrolment_info_capture_active');
        $infoCaptureActive = !empty($infoCaptureVal);
        if (!$infoCaptureActive) {
            $infoCaptureVal = 0;
            update_option('ax_enrolment_info_capture_active', $infoCaptureVal, false);
        }
        $options = array(
            0 => "Not Enabled",
            1 => "Enabled",
        );
        echo '<select name="ax_enrolment_info_capture_active">';
        foreach ($options as $key => $value) {
            if ($key == $infoCaptureVal) {
                echo '<option value="' . $key . '" selected="selected">' . $value . '</option>';
            } else {
                echo '<option value="' . $key . '">' . $value . '</option>';
            }
        }
        echo '</select>';
        echo '<p><em>A valid Portfolio Type ID and Template ID need to be provided for this feature to work correctly.</em></p>';
        echo '<p><em>The ID can be found in the page URL when viewing a Template (PlanID) or Portfolio Type.</em></p>';
        echo '<p><em> Include [Enrolment Signature] and [Enrolment Terms] in the templates to capture the terms and signature provided in the Billing/Enrolment Step of the enrolment form.</em></p>';
    }

    public function field_enrolment_info_capture_template_id_p()
    {
        $opt = get_option('ax_enrolment_info_capture_template_id_p');
        echo '<input type="number" name="ax_enrolment_info_capture_template_id_p" value="' . $opt . '" />';
        echo '<p><em>Enter the Template ID of the template (within aXcelerate) that you wish to use to capture Class enrolment information.</em></p>';
        echo '<p><em>This template should contain all contact and enrolment fields that you wish to capture about Class enrolments.</em></p>';
    }

    public function field_enrolment_info_capture_template_id_w()
    {
        $opt = get_option('ax_enrolment_info_capture_template_id_w');
        echo '<input type="number" name="ax_enrolment_info_capture_template_id_w" value="' . $opt . '" />';
        echo '<p><em>Enter the Template ID of the template (within aXcelerate) that you wish to use to capture Workshop enrolment information.</em></p>';
        echo '<p><em>This template should contain all contact and enrolment fields that you wish to capture about Workshop enrolments.</em></p>';
    }

    public function field_enrolment_info_capture_portfolio_type_id()
    {
        $opt = get_option('ax_enrolment_info_capture_portfolio_type_id');
        echo '<input type="number" name="ax_enrolment_info_capture_portfolio_type_id" value="' . $opt . '" />';
        echo '<p><em>The ID of the Portfolio Type used to determine the type of portfolio item that will be generated to store the enrolment document.</em></p>';
        echo '<p><em>The ID (CertID) can be found in the page URL when editing a Portfolio Type.</em></p>';
    }

    public function sanitize_parse_number($option)
    {
        //sanitize
        $option = intval(sanitize_text_field($option), 10);

        return $option;
    }

}
