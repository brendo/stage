(function($) {

	/**
	 * Stage is a JavaScript utility for Symphony 
	 * which adds a multiselect interface to the backend.
	 *
	 * @author: Nils Hörrmann, post@nilshoerrmann.de
	 * @source: http://github.com/nilshoerrmann/stage
	 */
	$(document).ready(function() {

		// Language strings
		Symphony.Language.add({
			'Browse': false,
			'Create New': false,
			'Remove Item': false,
			'No items found.': false
		});

		// Initialize Stage
		$('div.stage').each(function() {
			var stage = $(this),
				field = stage.parent(),
				selection = stage.find('ul.selection'),
				templates = stage.find('li.template').remove(),
				empty = stage.find('li.empty').remove(),			
				items = stage.find('li'),
				queue = $('<div class="queue"><ul></ul></div>'),
				index;

			// Handle empty stage
			if(empty.size() == 0) {
				empty = templates.filter('.create');
			}
			if(items.size() == 0) {
				selection.append(empty);
			}
			
			// Set sort order
			if(stage.is('.draggable')) {
				var sortorder = field.find('input[name*=sort_order]').val();
				
				if(sortorder && sortorder != 0) {
					sortorder = sortorder.split(',').reverse();
					$.each(sortorder, function(index, id) {
						items.filter('[data-value=' + id + ']').prependTo(selection);
					});
				}
			}			

			// Add constructors
			if(stage.is('.constructable')) {
				$('<a class="create">' + Symphony.Language.get('Create New') + '</a>').prependTo(queue);
			}

			// Add destructors
			if(stage.is('.destructable')) {
				var destructor = $('<a class="destructor">' + Symphony.Language.get('Remove Item') + '</a>');
				items.append(destructor.clone());
				
				// It's possible that the empty message is a create template
				if(empty.is('.template.create')) {
					empty.append(destructor.clone());
				}
			}
	
			// Add search field
			if(stage.is('.searchable')) {
				$('<input type="search" placeholder="' + Symphony.Language.get('Browse') + ' &#8230;" class="browser" value="" />').prependTo(queue);
			}

			// Add queue
			// Note: The queue list is always available
			if(queue.children().size() > 1) {
				queue.find('ul').hide();
				selection.after(queue);
			}
			
			// Make draggable
			if(stage.is('.draggable')) {
				selection.symphonyOrderable({
					items: 'li',
					handles: 'span',
				});
			}
		
			// Store templates:
			// This is needed for other script that interact with Stage
			stage.data('templates.stage', {
				templates: templates,
				empty: empty			
			});

		/*-----------------------------------------------------------------------*/
		
			// Clicking
			stage.bind('click.stage', function(event) {
			
				// Prevent click-trough
				event.stopPropagation();
			});
			
			// Constructing
			stage.delegate('a.create', 'click.stage', function(event) {
				event.preventDefault();
				
				// Create new item
				construct();
				
				// Close browser
				stage.trigger('browsestop');		
			});
			queue.delegate('li', 'construct.stage', function() {
				var item = $(this);
				construct(item);
			});

			// Destructing
			stage.delegate('a.destructor', 'click.stage', function(event) {
				event.preventDefault();

				// Find and destruct item
				var item = $(this).parents('li');
				item.trigger('destruct');
			});
			stage.delegate('li', 'destruct.stage', function() {
				var item = $(this);
				destruct(item);
			});
			
			// Selecting
			queue.delegate('li', 'click.stage', function() {
				var item = $(this);
				choose(item);
			});
						
			// Queuing
			stage.delegate('.browser', 'click.stage', function() {
				stage.trigger('browsestart');
				queue.find('ul').slideDown('fast');

				// Close queue on body click
				$('body').one('click.stage', function() {
					stage.trigger('browsestop');
				});
			})
			stage.bind('browsestop.stage', function() {
				queue.find('.browser').val('');
				queue.find('ul').slideUp('fast');
			});
			
			// Updating
			stage.bind('update.stage', function() {
				sync();
			});
			
			// Searching
			stage.delegate('.browser', 'keyup.stage', function(event) {
				var strings = $.trim($(event.target).val()).toLowerCase().split(' ');

				// Searching
				if(strings.length > 0 && strings[0] != '') {
					stage.trigger('searchstart', [strings]);
				}
								
				// Not searching 
				else {
					queue.find('li').slideDown('fast');
					stage.trigger('searchstop');
					stage.trigger('browsestart');
				}
			});
			stage.bind('searchstart.stage', function(event, strings) {
				search(strings);			
			});
			
			// Sorting
			selection.bind('orderstop.stage', function() {

				// Get new item order
				var sortorder = selection.find('li').map(function() {
					return $(this).attr('data-value');
				}).get().join(',');

				// Save sortorder				
				field.find('input[name*="sort_order"]').val(sortorder);
			});
			
			// Dragging
			selection.bind('orderstart.stage', function() {
				selection.addClass('dragging');
			});
			selection.bind('orderstop.stage', function() {
				selection.removeClass('dragging');
			});
					
		/*-----------------------------------------------------------------------*/

			// Construct an item
			var construct = function(item) {
				stage.trigger('constructstart', [item]);
				selection.addClass('constructing');

				// Remove empty selection message
				empty.slideUp('fast', function() {
					empty.remove();
				});
				
				// Existing item
				if(item) {
					item = item.clone(true).hide().appendTo(selection);
					items = items.add(item);
				}
				
				// New item
				else {
					item = templates.filter('.create').clone().removeClass('template create empty').addClass('new').hide().appendTo(selection);
					items = items.add(item);
				}
				
				// Add destructor
				if(stage.is('.destructable') && item.has('a.destructor').size() == 0) {
					item.append(destructor.clone());
				}
				
				// Destruct other items in single mode
				if(stage.is('.single')) {
					items.not(item).trigger('destruct');
				}
				
				// Sync queue
				queue.find('li[data-value="' + item.attr('data-value') + '"]').trigger('choose');
				
				// Show item
				item.appendTo(selection).slideDown('fast', function() {
					selection.removeClass('constructing');
					stage.trigger('constructstop', [item]);
				});
			};

			// Destruct an item
			var destruct = function(item) {
				stage.trigger('destructstart', [item]);
				selection.addClass('destructing');
				
				// Update queue
				queue.find('li[data-value=' + item.attr('data-value') + ']').removeClass('selected');
				
				// Check selection size
				if(items.not(item).size() == 0 && !selection.is('.constructing') && !selection.is('.choosing')) {
					
					// It's possible that the empty message is a create template
					if(empty.is('.template.create')) {
						var empty_item = empty.clone().appendTo(selection).slideDown('fast').removeClass('template create empty');
						items = items.add(empty_item);
					}
					else {
						empty.appendTo(selection).slideDown('fast');
					}
				}
				
				// Sync queue
				queue.find('li[data-value="' + item.attr('data-value') + '"]').trigger('choose');

				// Remove item
				item.addClass('destructing').slideUp('fast', function() {
					item.remove();
					items = items.not(item);
					stage.trigger('destructstop', [item]);
				});

				selection.removeClass('destructing');
			};
			
			// Choose an item in the queue
			var choose = function(item) {
				stage.trigger('choosestart', [item]);
				selection.addClass('choosing');
			
				// Deselect
				if(item.is('.selected')) {
				
					// Destruct item
					if(stage.is('.destructable')) {
						item.removeClass('selected');
						selection.removeClass('choosing').find('li[data-value="' + item.attr('data-value') + '"]').trigger('destruct');
					}
				}
				
				// Select
				else {

					// Single selects
					if(stage.is('.single')) {
						items.trigger('destruct');
					}
				
					// Construct item	
					if(stage.is('.searchable')) {
						item.addClass('selected');
						item.trigger('construct');
					}
	
					selection.removeClass('choosing');
				}
				
				stage.trigger('choosestop', [item]);
			};
				
			// Search the queue
			var search = function(strings) {
				var queue_items = queue.find('li');

				// Build search index
				if(!index) {
					index = queue.find('li').map(function() {
						return $(this).text().toLowerCase();
					});
				}
				
				// Search
				index.each(function(position, content) {
					var found = true,
						current = queue_items.filter(':nth(' + position + ')');

					// Items have to match all search strings
					$.each(strings, function(count, string) {
						if(content.search(string) == -1) {
							found = false;
						}
					});
				
					// Show matching items
					if(found) {
						current.slideDown('fast');
					}

					// Hide other items
					else {
						current.slideUp('fast');
					}
				});

				// Found
				if(queue_items.filter(':visible').size() > 0) {
					stage.trigger('searchfound');
				}

				// None found
				else {
					stage.trigger('searchnonfound');
				}
			};
			
			// Synchronize lists
			var sync = function() {
				queue.find('li').removeClass('selected');
				selection.find('li').each(function(index, item) {
					queue.find('li[data-value="' + $(item).attr('data-value') + '"]').addClass('selected');
				});
			};
			
			// Drag items
			var drag = function() {
			
			};
					
		});

	});
	
})(jQuery.noConflict());
