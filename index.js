var Reflux = require('reflux');
var Immutable = require('immutable');
var request = require('superagent');

// Default CRUD actions
var CRUDActions = {
    'create': {
        asyncResult: true,
        children: ['progressed']
    },
    'read': {
        asyncResult: true,
        children: ['progressed'] },
    'delete': {
        asyncResult: true,
        children: ['progressed']
    },
    'update': {
        asyncResult: true,
        children: ['progressed']
    },
    'next':{
        asyncResult: true,
        children: ['progressed']
    }
};


// Default implementation of the
// CRUD operations.
// These can be overriden.

// Expects default CRUD endpoint,
// but one that does not contain ['results']
// in its response unless it has pagination.
// This is based on the default behaviour
// of Django REST.
var CRUDMixin = {
    getInitialState: function() {
        return this.data;
    },
    internalCreate: function(data) {
        // Add the item to the internal datastore.
        var item = Immutable.fromJS(data);
        var pk = item.get('pk');
        var olddata = this.data;

        this.data = this.data.set(pk, item);
        this.changed = Immutable.Map({
            pks: [pk],
            data: olddata
        });
        this.trigger(this.data, this.changed);
    },
    onCreate: function(data) {
        request('POST', this.endpoint).set(this.headers)
            .type('application/json').accept('application/json')
            .send(data).end(
                function(err, res) {
                    this.actions.create.progressed(data,err,res);
                    if (res.ok) {
                        this.actions.create.completed(res.body);
                    } else {
                        this.actions.create.failed(res.error);
                    }
                }.bind(this));
    },
    onCreateCompleted: function(newitem) {
        this.internalCreate(newitem);
    },
    onCreateFailed: function(err) {
        console.log(err);
    },
    onRead: function(pk) {
        var url = this.endpoint;
        if (pk) {
            url += pk + '/';
        }
        request('GET',url).accept('application/json')
                          .set(this.headers)
                          .end( function(err, res) {
                                this.actions.read.progressed(pk, err,res);
                                if (res.ok) {
                                    this.actions.read.completed(res.body);
                                } else {
                                    this.actions.read.failed(err);
                                }
                            }.bind(this));
    },
    onReadCompleted: function(res) {
        var pk = res.pk;
        if (res.results){
            this.nextpage = res.next;
            this.internalRead(pk, res.results);
        } else {
            this.internalRead(pk, res);
        }
    },
    onReadFailed: function(err) {
        console.log(["Read failure on " + pk, err]);
    },
    onNext: function(){
        if (this.nextpage){
            request('GET',this.nextpage).accept('application/json')
            .set(this.headers)
            .end(
                function(err, res) {
                    if (res.ok) {
                        this.actions.next.completed(res.body);
                    } else {
                        this.actions.next.failed(err);
                    }
                }.bind(this));

        } else {
            this.actions.next.failed({nomore: true});
        }
    },
    onNextCompleted: function(res){
        this.nextpage = res.next;
        this.internalRead(null,res.results,true);
    },
    onNextFailed: function(err){
        if(err.nomore){
           // Expected result when paginating.
        } else {
            console.log(err);
        }
    },
    internalRead: function(pk, response, pagination) {
        // Add the data to the datastore.
        var resp = Immutable.fromJS(response);
        var olddata = this.data;
        var pks = null;
        if (pk) {
            this.data = this.data.set(pk, resp);
            pks = Immutable.List([pk]);
        } else {
            var newdata = resp.map(function(item) {
                return [item.get('pk'), item];
            }).fromEntrySeq();
            if(!pagination) this.data = this.data.clear();
            this.data = this.data.merge(newdata);
            pks = Immutable.List(newdata.keys());
        }
        this.changed = Immutable.Map({
            pks: pks,
            data: olddata
        });
        this.trigger(this.data, this.changed);
    },
    internalDelete: function(pk) {
        // Just remove it from the store.
        var olddata = this.data;
        var pks = Immutable.List([pk]);

        this.data = this.data.delete(pk);

        this.changed = Immutable.Map({
            pks: pks,
            data: olddata
        });

        this.trigger(this.data, this.changed);
    },
    onDelete: function(pk) {
        var url = this.endpoint + pk + '/';
        request('DELETE',url).set(this.headers).end(
            function(err, res) {
                this.actions.delete.progressed(pk,err,res);
                if (res.ok) {
                    this.actions.delete.completed(pk);
                } else {
                    this.actions.delete.failed(res.error);
                }
            }.bind(this));
    },
    onDeleteCompleted: function(pk) {
        this.internalDelete(pk);
    },
    onDeleteFailed: function(err) {
        console.log(err);
    },
    internalUpdate: function(pk, data) {
        var item = Immutable.fromJS(data);
        var pks = Immutable.List([pk]);
        var olddata = this.data;

        this.data = this.data.mergeIn([pk], item);
        this.changed = Immutable.Map({
            pks: pks,
            data: olddata
        });
        this.trigger(this.data, this.changed);
    },
    onUpdate: function(pk, data) {
        // Update the given item with the given data.
        var url = this.endpoint + pk + '/';
        request('PATCH',url).type('application/json').accept('application/json')
        .set(this.headers)
        .send(data).end(
            function(err, res) {
                this.actions.update.progressed(pk, data, err, res);
                if (res.ok) {
                    this.actions.update.completed(res.body);
                } else {
                    this.actions.update.failed(err);
                }
            }.bind(this));
    },
    onUpdateCompleted: function(res) {
        var pk = res.pk;
        this.internalUpdate(pk, res);
    },
    onUpdateFailed: function(pk, err) {
        console.log(err);
    },
    forceTrigger: function(){
        this.trigger(this.data,this.changed);
    }
};


module.exports = {
    store: function(options){
        var actions = Reflux.createActions(CRUDActions);
        return Reflux.createStore({
            mixins: [CRUDMixin],
            listenables: actions,
            data: Immutable.Map(),
            nextpage: null,
            actions: actions,
            headers: options.headers,
            changed: Immutable.List(),
            label: options.label,
            endpoint: options.endpoint
        });
    },
    mixin: CRUDMixin,
    actions: CRUDActions
};
