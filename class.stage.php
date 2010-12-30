<?php

	/**
	 * @package stage
	 */
	/**
	 * The Stage class offers function to display and save 
	 * Stage settings in the section editor. 
	 */
	class Stage {
	
		public static function install() {
			$status = array();
			
			// Create database stage table
			$status[] = Administration::instance()->Database->query(
				"CREATE TABLE IF NOT EXISTS `tbl_fields_stage` (
					`id` int(11) unsigned NOT NULL auto_increment,
					`field_id` int(11) unsigned NOT NULL default '0',
					`constructable` smallint(1) default '0',
					`destructable` smallint(1) default '0',
					`draggable` smallint(1) default '0',
					`droppable` smallint(1) default '0',
					`searchable` smallint(1) default '0',
					`context` varchar(255) default NULL,
					PRIMARY KEY  (`id`)
				) TYPE=MyISAM;"
			);
			
			// Create database sorting table
			$status[] = Administration::instance()->Database->query(
				"CREATE TABLE IF NOT EXISTS `tbl_fields_stage_sorting` (
					`id` int(11) unsigned NOT NULL AUTO_INCREMENT,
					`entry_id` int(11) NOT NULL,
					`field_id` int(11) NOT NULL,
					`order` text,
					`context` varchar(255) default NULL,
					PRIMARY KEY (`id`)
				)"
			);

			// Report status
			if(in_array(false, $status, true)) {
				return false;
			}
			else {
				return true;
			}
		}

		/**
		 * Display settings in the section editor.
		 *
		 * @param number $field_id
		 *  ID of the field linked to the Stage instance
		 * @param number $position
		 *  Field position in section editor
		 * @param string $title
		 *  Title of the settings fieldset
		 * @return XMLElement
		 *  Returns the settings fieldset
		 */
		public static function displaySettings($field_id, $position, $title) {
		
			// Create settings fieldset
			$fieldset = new XMLElement('fieldset', '<legend>' . $title . '</legend>', array('class' => 'settings group compact'));
			
			// Get stage settings
			$stage = Administration::instance()->Database->fetchRow(0, 
				"SELECT * FROM tbl_fields_stage WHERE field_id = '" . $field_id . "' LIMIT 1"
			);
			
			// Handle missing stage settings
			if(empty($stage)) {
				$stage = array(
					'constructable' => 1,
					'destructable' => 1,
					'searchable' => 1,
					'droppable' => 0,
					'draggable' => 1
				);
			}
			
			// Constructable
			$setting = new XMLElement('label', '<input name="fields[' . $position . '][stage][constructable]" value="1" type="checkbox"' . ($stage['constructable'] == 0 ? '' : ' checked="checked"') . '/> ' . __('Allow creation of new items') . ' <i>' . __('This will add a <code>Create New</code> button to the interface') . '</i>');
			$fieldset->appendChild($setting);
			
			// Destructable		
			$setting = new XMLElement('label', '<input name="fields[' . $position . '][stage][destructable]" value="1" type="checkbox"' . ($stage['destructable'] == 0 ? '' : ' checked="checked"') . '/> ' . __('Allow deselection of items') . ' <i>' . __('This will add a <code>Remove</code> button to the interface') . '</i>');
			$fieldset->appendChild($setting);
			
			// Searchable
			$setting = new XMLElement('label', '<input name="fields[' . $position . '][stage][searchable]" value="1" type="checkbox"' . ($stage['searchable'] == 0 ? '' : ' checked="checked"') . '/> ' . __('Allow selection of items from a list of existing items') . ' <i>' . __('This will add a search field to the interface') . '</i>');
			$fieldset->appendChild($setting);
			
			// Droppable
			$setting = new XMLElement('label', '<input name="fields[' . $position . '][stage][droppable]" value="1" type="checkbox"' . ($stage['droppable'] == 0 ? '' : ' checked="checked"') . '/> ' . __('Allow dropping of items') . ' <i>' . __('This will enable item dropping on textareas') . '</i>');
			$fieldset->appendChild($setting);
			
			// Draggable
			$setting = new XMLElement('label', '<input name="fields[' . $position . '][stage][draggable]" value="1" type="checkbox"' . ($stage['draggable'] == 0 ? '' : ' checked="checked"') . '/> ' . __('Allow sorting of items') . ' <i>' . __('This will enable item dragging and reordering') . '</i>');
			$fieldset->appendChild($setting);
			
			// Return stage settings
			return $fieldset;
			
		}
		
		/**
		 * Save setting in the section editor.
		 *
		 * @param number $field_id
		 *  ID of the field linked to this Stage instance
		 * @param array $data
		 *  Data to be stored
		 * @param string $context
		 *  Context of the Stage instance		 
		 */
		public static function saveSettings($field_id, $data, $context) {
			Administration::instance()->Database->query(
				"DELETE FROM `tbl_fields_stage` WHERE `field_id` = '$field_id' LIMIT 1"
			);
					
			// Save new stage settings for this field
			if(is_array($data)) {
				Administration::instance()->Database->query(
					"INSERT INTO `tbl_fields_stage` (`field_id`, " . implode(', ', array_keys($data)) . ", `context`) VALUES ($field_id, " . implode(', ', $data) . ", 'subsectionmanager')"
				);
			}
			else {
				Administration::instance()->Database->query(
					"INSERT INTO `tbl_fields_stage` (`field_id`, `context`) VALUES ($field_id, $context)"
				);
			}
		}
		
		/**
		 * Get components
		 *
		 * @param number $field_id
		 *  ID of the field linked to this Stage instance
		 * @return array
		 *  Array of active components
		 */
		public static function getComponents($field_id) {
		
			// Fetch settings
			$settings = Administration::instance()->Database->fetchRow(0,
				"SELECT `constructable`, `destructable`, `draggable`, `droppable`, `searchable` FROM `tbl_fields_stage` WHERE `field_id` = '" . $field_id . "' LIMIT 1"
			);
			
			// Remove disabled components
			foreach($settings as $key => $value) {
				if($value == 0) unset($settings[$key]);
			}
			
			// Return active components
			return array_keys($settings);
		}
		
	}
	