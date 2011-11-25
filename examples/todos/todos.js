//the model

Task = Backbone.Model.extend({
	defaults : {
		// ELMS: Use defaults to keep your initialize function clean
		//       from simple attribute defaults
		status : "incomplete"
	},
    initialize: function()
    {
        this.bind("change:name",this.nameChanged);
    },
    nameChanged: function()
    {
        log( "Task.nameChanged() - change event can be captured on the model, not just the view");
    },
	isComplete : function(){
        log( "Task.isComplete()");
		//ELMS: Always remember to use get() rather than eg; this.status
		return this.get("status") === "completed";
	},
	//normally you don't need to do this save, which is built in, will $.ajax to a remote URL
	save : function(){
        log( "Task.save()");
		//ELMS: Yes save() is called by collection.create(). You can pass attributes
		//      into save() to tell it which attributes to update. Here we are storing
		//		the collection's models locally to a global array so we don't want
		//		Backbone.sync to get hold of it. The default save() will go to sync
		tasks.add(this);
	},
	//let the model figure out the mechanism
	toggleStatus : function(){
        log( "Task.toggleStatus()");
		//ELMS: This sets the model's status attribute using set() which runs validation
		//	    and raises the "change" event. You can pass an error handler into set()
		//      or catch "trigger" at a higher level. The source code is quite easy to
		//      I'm enjoying picking this apart
		this.get("status") == "incomplete" ? this.set({status : "completed"}) : this.set({status : "incomplete"});
	}
});

//the collection
Tasks = Backbone.Collection.extend({
	//ELMS: A collection is collection of models of a given type
	model : Task,

	//if your tasks are stored in a database - set the RESTful URL here
	//url : "/tasks" //is a prime example
	//ELMS: We are overriding the save() in the model so backbone sync never gets
	//      called and uses the url property. You can also make url() a method
	//	    that returns a url based on whether the model is new or existing. Take
	//      this example from VidPub :
	//
	//		url: function () {
	//        return this.isNew() ? "/api/episodes/create" : "/api/episodes/edit/" + this.get("ID");
	//
	//	    Backbone uses REST so use action filter attributes like HttpGet, HttpPut etc...

	//you could bind to this - or just use the length as below
    //ELMS: I'm not sure what he means "bind to this". 
	completed : function(){
        log( "Tasks.completed()");
		return  _.select(this.models, function(model){
			return model.get("status") == "completed";
		});
	},
	incomplete : function(){
        log( "Tasks.incomplete()");
		return _.select(this.models, function(model){
			return model.get("status") == "incomplete";
		});
	}
});

//a global reference to the collection
//ELMS: I think this should be in the router instance not global
tasks = new Tasks();

//The form
//ELMS: This form houses just the main input where new ToDo items are created
//      it is not the main list of ToDo items, that's TaskListView
TaskFormView = Backbone.View.extend({
	initialize : function(){
        log( "TaskFormView.initialize()");
        //ELMS: The template we'll use here. Backbone doesn't force you to use
        //      jQuery templates at all, we could write directly to the DOM or
        //      use a different templating library. What it does give you is a
        //      well structured framework to organize your code and separate its
        //      concerns
		this.template = $("#formTemplate");
	},
	events : {
		//capture the submit event
        //ELMS: events are limited to the views DOM element ("el"). This particular
        //      event is targetting the submit event on the #todo-form selector.
        //      An HTML form with a single text input field raises the submit
        //      event when you press enter. Never knew that!
		"submit #todo-form" : "save"
	},
	render : function() {
        log( "TaskFormView.render()");
        //ELMS: You'll call render in response to change events, or manually call it
        //      when you're programmatically altering the model
		var content = this.template.tmpl(); //ELMS: This could be put in initialize()
		$(this.el).html(content);
		return this;
	},
    //ELMS: This is triggered when enter is pressed on the single text input form. This
    //      must be in the html spec coz all browsers raise this event when there is a
    //      single text input on a form and you press enter. With two or more inputs
    //      it doesn't raise the submit event, you need a submit button
	save : function(){
        log( "TaskFormView.save()");
		//save
		//read this directly. You could also just bind right to the form using the ModelBinder plugin
		//https://github.com/derickbailey/backbone.modelbinding
		var val =  this.$("input").val();
		var model = new Task({name : val, id : tasks.length });
		model.save();
		//clear the input
		this.$("input").val("");
		//stop the form from submitting
		event.preventDefault();
	}
});

TaskItemView = Backbone.View.extend({
    template: $(
        '<div class="todo">' +
            '<div class="display">' +
                '<input class="check" type="checkbox"  data-id="${id}"/>' +
                '<div class="todo-content">${name}</div>' +
                '<span class="todo-destroy" data-id="${id}"></span>' +
            '</div>' +
            '<div class="edit">' +
                '<form>' +
                    '<input class="todo-input" type="text" value="${name}" />' +
                '</form>' +
            '</div>' +
        '</div>'),

	tagName : "li",
	initialize : function(){
        log( "TaskItemView.initialize()");
		//this.template = $("#item-template");
		//rescope "this" so it's available to the methods requiring it
		_.bindAll(this,"render","toggleComplete","setStatus","clear","updateModel");
		//bind the change event to the status toggle
        //ELMS: There is a difference between DOM events and Backbone events. The
        //      Backbone "change" event is triggered when set() is used for example.
        //      There are a few backbone events triggered by backbone.js :
        //
        //      model :
        //          change:[attr]
        //          destroy
        //          error
        //
        //      collection :
        //          add
        //          remove
        //          reset
        //
        //      route :
        //          route:[route name]
        //
        //      The reason that these model events are handled in the view is that
        //      the view changes when these events are fired.
		this.model.bind("change:status",this.setStatus);
        //this.model.bind("change",this.modelHasChanged);
		this.model.bind("change:name",this.render);
	}, 
	events : {
        //ELMS: These are the true DOM events raised by the browser. Backbone
        //      delegates these events from "el" to the functions you want.
        //      Look at Backbone.view.delegateEvents to see how it parses
        //      this list of events and binds them to your functions. These
        //      are different than the triggered Backbone mode/collection
        //      events such as add, reset, remove, destroy etc...
		//checkbox click
		"click :checkbox" : "toggleComplete",
		//destroy button
		"click span.todo-destroy"   : "clear",
		//edit bits - turn on the editor on double-click
		"dblclick div.todo-content" : "toggleEdit",
		//turn off the editor when it loses focus - then update the model
		//the change event on the model will fire render here
		"blur .todo-input" : "updateModel",

        //ELMS: I've added a form around the input so that I can trap the
        //      submit event (triggered when you press enter if a form has a
        //      single test input). However the blur event will still trigger
        //      so I have to check for this in the updateModel function
        "submit" : "updateModel"
	},
    modelHasChanged: function()
    {
        log( "TaskItemView.modelHasChanged()");
    },
	render : function(){
        log( "TaskItemView.render()");
		//render the jQuery template
        //ELMS: We setup the template in the initialize function. Since
        //      the template never changes perhaps this could be globalled
        //      off as a single template rather than one-per-view
		var content = this.template.tmpl(this.model.toJSON());
		//take the rendered HTML and pop it into the DOM
        //ELMS: Quite simple really, shove the template result into "el". If
        //      "el" is already in the dom it will instantly be visible. However
        //      it is better practice to have render return this so the caller can
        //      do what it wants with the template result eg;
        //
        //          $("body").append( view.render().el);
        //
        //      This is best practice becuase the views have less responsibility
        //      and are not concerned with the display, just the template result.
        //      This results in testable code. Even if you don't unit test your
        //      code, if it is designed to be testable you've already succeeded
        //
		$(this.el).html(content);
		return this;
	},
    submitted : function( event)
    {
        log( "TaskItemView.submitted()");
        event.preventDefault();
        //this.updateModel();
    },
    //ELMS: Handle the "is complete" checkbox and update the model. If you don't
    //      update the model it no longer reflects the UI. So it's important!
	toggleComplete : function(){
        log( "TaskItemView.toggleComplete()");
		this.model.toggleStatus();
	},
	clear : function(evt){
        log( "TaskItemView.clear()");
		tasks.remove(this.model);
	},
	setStatus : function(){
        log( "TaskItemView.setStatus()");
		//trigger the status change
		this.$(".todo").toggleClass("done");
	},
	toggleEdit : function(){
        log( "TaskItemView.toggleEdit()");
	  $(this.el).toggleClass("editing");
      this.$("input").focus();
	},
    //ELMS: This is a more interesting event handler. We not only
    //      update the model with the new task description we
    //      also change the class of the view container so that
    //      the input disappears and the description reappears.
    //      Then when we update the model it is re-rendered
	updateModel : function( event){
        log( "TaskItemView.updateModel( '" + this.$(".todo-input").val() + "')");
        event.preventDefault();
        if( $(this.el).hasClass("editing"))
        {
		    $(this.el).toggleClass("editing");
		    this.model.set({name :  this.$(".todo-input").val()});
        }
	},
});

//The items that have been entered and/or completed
TaskListView = Backbone.View.extend({

	initialize : function(){
        log( "TaskListView.initialize()");
		_.bindAll(this,"render");
		//rerender whenever there's a change to the collection
		//if you're pulling data remotely - bind to "fetch" here
		//in our case - this is all in memory
		this.collection.bind("add", this.render);
		this.collection.bind("remove", this.render);
	},
	render : function() {
        log( "TaskListView.render()");
		//clear out the existing list to avoid "append" duplication
		$(this.el).empty();
		//use an array here rather than firehosing the DOM
		//perf is a bit better
		var els = [];
		//loop the collection...
		this.collection.each(function(model){
			//rendering a view for each model in the collection
			var view = new TaskItemView({model : model});
			//adding it to our array
		    els.push(view.render().el);
		});
		//push that array into this View's "el"
		$(this.el).append(els);
		return this;
	}
});

TaskStatsView = Backbone.View.extend({
	initialize : function(){
        log( "TaskStatsView.initialize()");
		this.template = $("#stats-template");
		//rescope "this"
		_.bindAll(this,"render", "clearCompleted");
		//bind to collection change events - including the trigger that's bubbled up from the 
		//model's toggleStatus event
        //ELMS: Ah this is crucial. If a model's status attribute changes, and the model
        //      is in a collection then the change event will bubble up from the model
        //      to the collection, just like DOM event bubbling. So here, when a model's
        //      status is changed, the stats view needs to change because the stats view's
        //      purpose in life is to show the total of different model status's ie; complete
        //      and incomplete.
		this.collection.bind('change:status', this.render, this);
		this.collection.bind("add", this.render);
		this.collection.bind("remove", this.render);
	},
	events : {
		//removes the completed tasks
		"click #clear-completed" : "clearCompleted"
	},
	render : function() {
        log( "TaskStatsView.render()");
		var completedCount = this.collection.completed().length;
		var remainingCount = this.collection.incomplete().length;
		var content = this.template.tmpl({completed: completedCount, remaining: remainingCount});
		$(this.el).html(content);
		return this;
		
	},
    //ELMS: The view has access to the collection because it is passed in when it is
    //      new'd up in the router. 
	clearCompleted : function(){
        log( "TaskStatsView.clearCompleted()");
		//simply pass the completed() array to the collection's remove method
		this.collection.remove(this.collection.completed());
		event.preventDefault();
	}
});

//The Router
TodoList = Backbone.Router.extend({
	initialize : function(){
        log( "Router.initialize()");
		formView = new TaskFormView({collection : tasks, el : "#todo-form"});
		listView = new TaskListView({collection : tasks, el : "#todo-list"});
		statsView = new TaskStatsView({collection :tasks, el : "#todo-stats"});
	},
	//"" is the default route and always displays. Other possible routes here
	// might be "completed" or "incomplete" which shows a list of those tasks
	routes : {
		"" : "index"
	},
	index : function(){
        log( "Router.index()");
		//pop the form - the rest of the views render themselves
		//based on events in the collection and the model
		formView.render();		
	}
});

function log( message)
{
    $("#logContents").append( "<div>" + message + "</div>");
}

$(function(){
	//create the router...
	app = new TodoList();
	//start recording browser history. Although we don't have that need
	//since we don't navigate between routes
	Backbone.history.start();
});