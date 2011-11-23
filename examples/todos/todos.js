//the model
Task = Backbone.Model.extend({
	defaults : {
		// ELMS: Use defaults to keep your initialize function clean
		//       from simple attribute defaults
		status : "incomplete"
	},
	isComplete : function(){
		//ELMS: Always remember to use get() rather than eg; this.status
		return this.get("status") === "completed";
	},
	//normally you don't need to do this save, which is built in, will $.ajax to a remote URL
	save : function(){
		//ELMS: Yes save() is called by collection.create(). You can pass attributes
		//      into save() to tell it which attributes to update. Here we are storing
		//		the collection's models locally to a global array so we don't want
		//		Backbone.sync to get hold of it. The default save() will go to sync
		tasks.add(this);
	},
	//let the model figure out the mechanism
	toggleStatus : function(){
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
		return  _.select(this.models, function(model){
			return model.get("status") == "completed";
		});
	},
	incomplete : function(){
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
		"submit #todo-form" : "save"
	},
	render : function() {
        //ELMS: You'll call render in response to change events, or manually call it
        //      when you're programmtically altering the model
		var content = this.template.tmpl(); //ELMS: This could be put in initialize()
		$(this.el).html(content);
		return this;
	},
	save : function(){
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
	tagName : "li",
	initialize : function(){
		this.template = $("#item-template");
		//rescope "this" so it's available to the methods requiring it
		_.bindAll(this,"render","toggleComplete","setStatus","clear","updateModel");
		//bind the change event to the status toggle
		this.model.bind("change:status",this.setStatus);
		this.model.bind("change:name",this.render);
	}, 
	events : {
		//checkbox click
		"click :checkbox" : "toggleComplete",
		//destroy button
		"click span.todo-destroy"   : "clear",
		//edit bits - turn on the editor on double-click
		"dblclick div.todo-content" : "toggleEdit",
		//turn off the editor when it loses focus - then update the model
		//the change event on the model will fire render here
		"blur .todo-input" : "updateModel"
	},
	render : function(){
		//render the jQuery template
		var content = this.template.tmpl(this.model.toJSON());
		//take the rendered HTML and pop it into the DOM
		$(this.el).html(content);
		return this;
	},
	toggleComplete : function(){
		this.model.toggleStatus();
	},
	clear : function(evt){
		tasks.remove(this.model);
	},
	setStatus : function(){
		//trigger the status change
		this.$(".todo").toggleClass("done");
	},
	toggleEdit : function(){
	  $(this.el).toggleClass("editing");
      this.$("input").focus();
	},
	updateModel : function(){
		$(this.el).toggleClass("editing");
		this.model.set({name :  this.$(".todo-input").val()});
	},
});

//The items that have been entered and/or completed
TaskListView = Backbone.View.extend({

	initialize : function(){
		_.bindAll(this,"render");
		//rerender whenever there's a change to the collection
		//if you're pulling data remotely - bind to "fetch" here
		//in our case - this is all in memory
		this.collection.bind("add", this.render);
		this.collection.bind("remove", this.render);
	},
	render : function() {
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
		this.template = $("#stats-template");
		//rescope "this"
		_.bindAll(this,"render", "clearCompleted");
		//bind to collection change events - including the trigger that's bubbled up from the 
		//model's toggleStatus event
		this.collection.bind('change:status', this.render, this);
		this.collection.bind("add", this.render);
		this.collection.bind("remove", this.render);
	},
	events : {
		//removes the completed tasks
		"click #clear-completed" : "clearCompleted"
	},
	render : function() {
		var completedCount = this.collection.completed().length;
		var remainingCount = this.collection.incomplete().length;
		var content = this.template.tmpl({completed: completedCount, remaining: remainingCount});
		$(this.el).html(content);
		return this;
		
	},
	clearCompleted : function(){
		//simply pass the completed() array to the collection's remove method
		this.collection.remove(this.collection.completed());
		event.preventDefault();
	}
});

//The Router
TodoList = Backbone.Router.extend({
	initialize : function(){
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
		//pop the form - the rest of the views render themselves
		//based on events in the collection and the model
		formView.render();		
	}
});

$(function(){
	//create the router...
	app = new TodoList();
	//start recording browser history. Although we don't have that need
	//since we don't navigate between routes
	Backbone.history.start();
});