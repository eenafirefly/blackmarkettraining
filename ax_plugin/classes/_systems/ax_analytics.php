<?php

if (!defined('ABSPATH')) {
	die('-1');
}

class AX_Analytics
{
	public function __construct()
	{
		// nothing needs to be set up here.
	}

	public static function register_analytics_script()
	{
		wp_register_script('ax-analytics', plugins_url('/classes/_shortcodes/js/analytics.js', AXIP_PLUGIN_NAME), array());
	}

	public static function enqueue_script()
	{
		wp_enqueue_script('ax-analytics');
	}

	public static function add_data_layer_to_page($dataLayer = array())
	{
		self::register_analytics_script();
		self::enqueue_script();
		// attempt to move the script earlier in the list to be appended.
		add_filter('print_scripts_array', function ($array) {
			array_unshift($array, 'ax-analytics');
			return $array;
		});

		try {
			if (isset($dataLayer)) {
				wp_add_inline_script('ax-analytics', 'var dataLayer = window.dataLayer || []; dataLayer = dataLayer.concat(' . json_encode($dataLayer) . ')');
			} else {
				wp_add_inline_script('ax-analytics', 'var dataLayer = window.dataLayer || [];');
			}
		} catch (\Throwable $th) {
			error_log(print_r($th, true));
			wp_add_inline_script('ax-analytics', 'var dataLayer = window.dataLayer || [];');
		}

	}

	public static function add_data_layer_for_course($courseDetail)
	{
		if (isset($courseDetail)) {
			$dataLayer = array(
				"course_name" => $courseDetail->NAME,
				"course_type" => $courseDetail->TYPE,
				"product_category" => 'Courses',
				"price" => $courseDetail->COST,
				"course_id" => $courseDetail->ID,
				"id" => $courseDetail->ID,
			);
			self::add_data_layer_to_page($dataLayer);
		}

	}
	public static function add_data_layer_for_enrolments($enrolmentData)
	{
		$dataLayer = array();
		if (key_exists('enrolment_status', $enrolmentData)) {

			foreach ($enrolmentData['enrolment_status'] as $enrolment) {

				$data = array(
					"data_type" => 'enrolment',
					'course_name' => !empty($enrolment['ENROLMENT']['COURSENAME']) ? $enrolment['ENROLMENT']['COURSENAME'] : '',
					'instance_id' => $enrolment['ENROLMENT']['instanceID'],
					'course_type' => $enrolment['ENROLMENT']['type'],
					'contact_id' => $enrolment['CONTACTID'],
					'instance_name' => !empty($enrolment['ENROLMENT']['NAME']) ? $enrolment['ENROLMENT']['NAME'] : '',
					'method' => $enrolmentData['method'],
					'payer_id' => $enrolment['ENROLMENT']['payerID'],
				);
				if (!empty($enrolment['ENROLMENT']->cost)) {
					$data['cost'] = $enrolment['ENROLMENT']['cost'];
				} else if (!empty($enrolment['ENROLMENT']['originalCost'])) {
					$data['cost'] = $enrolment['ENROLMENT']['originalCost'];
				} else {
					$data['cost'] = 0;
				}
				if (!empty($enrolment['ENROLMENT']['invoiceID'])) {
					//$data['invoice_id_internal'] = $enrolment['ENROLMENT']['invoiceID'];
				}

				array_push($dataLayer, $data);

			}

		} elseif (key_exists('enrolments', $enrolmentData)) {

			foreach ($enrolmentData['enrolments'] as $contactID => $instance) {
				foreach ($instance as $instanceID => $enrolment) {
					if ($instanceID != 'CONTACT_NAME') {
						$data = array(
							"data_type" => 'enrolment',
							'course_name' => $enrolment['COURSENAME'],
							'instance_id' => $enrolment['instanceID'],
							'course_type' => $enrolment['type'],
							'contact_id' => $contactID,
							'instance_name' => $enrolment['NAME'],
							'method' => $enrolmentData['method'],
							'payer_id' => $enrolment['payerID'],
						);
						if (!empty($enrolment['cost'])) {
							$data['cost'] = $enrolment['cost'];
						} else if (!empty($enrolment['originalCost'])) {
							$data['cost'] = $enrolment['originalCost'];
						} else {
							$data['cost'] = 0;
						}
						if (!empty($enrolmentData['invoiceID'])) {
							//$data['invoice_id_internal'] = $enrolment['ENROLMENT']['invoiceID'];
						}

						array_push($dataLayer, $data);
					}
				}

			}

		}
		self::add_data_layer_to_page($dataLayer);
	}
}

$AX_Analytics = new AX_Analytics();
