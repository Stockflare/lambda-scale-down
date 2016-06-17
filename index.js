// dependencies
var aws = require('aws-sdk');
var _ = require('underscore');
var path = require('path');
var when = require('when');
var moment = require('moment');

exports.handler = function(event, context) {

  console.log('event');
  console.log(event);

  var count = 6;
  if (event.count) count = parseInt(event.count);

  var region = 'us-east-1';
  if (event.region) region = event.region;

  var ecs = new aws.ECS({ region: region });


  var promise = when.promise(function(resolve, reject, notify) {

    var services = [];
    // First get all the currently running services
    when.unfold(function(last_token){
      // unspool

      if (last_token === 'start') last_token = null;

      return when.promise(function(resolve, reject, notify) {
        var params = {
          cluster: event.cluster,
          maxResults: 10
        };

        if (!_.isNull(last_token)) params.nextToken = last_token;

        ecs.listServices(params, function(err, data) {
          if (err) {
            console.log('listServices error');
            console.log(err, err.stack);
            reject(err);
          }
          else {
            console.log('listServices data');
            console.log(data);
            resolve([data.serviceArns, data.nextToken]);
          }
        });
      });

    }, function(last_token){
      // predicate
      // Stop when the last_token is null
      if (last_token) {
        return false;
      } else {
        return true;
      }
    }, function(arns){
      // handler
      _.each(arns, function(arn){
        services.push(arn);
      });
    }, 'start')
    .done(function(){
      // Got all the service ARNS
      console.log('ARNS');
      console.log(services);
    });

  });

  promise.done(function(data){
    console.log('Scale Down Comnpleted');
    context.succeed('Scale Down Comnpleted');
  }, function(error){
    console.log('Scale Down failed', error);
    context.fail('Scale Down Comnpleted:' + error);
  });


};
