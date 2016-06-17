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
            // console.log('listServices error');
            // console.log(err, err.stack);
            reject(err);
          }
          else {
            // console.log('listServices data');
            // console.log(data);
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
    .then(function(){
      // Got all the service ARNS  Now go through each one
      // console.log('ARNS');
      // console.log(services);

      // Process each ARN
      when.iterate(function(index){
        // f
        return index + 1;
      }, function(index){
        // predicate
        if (index >= services.length) {
          return true;
        } else {
          return false;
        }
      }, function(index){
        // handler

        var arn = services[index];
        // Get the details for this Service
        return when.promise(function(resolve, reject, notify){
          var params = {
            services: [arn],
            cluster: event.cluster
          };

          ecs.describeServices(params, function(err, data) {
            if (err) {
              // console.log('describeServices');
              // console.log(err, err.stack);
              reject(err);
            }
            else {
              // console.log('describeServices data');
              // console.log(data);
              resolve(data.services[0]);
            }
          });

        })
        .then(function(service){
          // Got the data for a service
          // console.log('service');
          console.log('Checking service: ' + service.serviceArn);

          // Scale down the service if needed
          return when.promise(function(resolve, reject, notify){
            if (service.desiredCount > count) {
              // Need to Scale Down
              console.log('Scaling Down: ' + service.serviceName);
              var params = {
                service: service.serviceName,
                cluster: event.cluster,
                desiredCount: count
              };

              ecs.updateService(params, function(err, data) {
                if (err) {
                  // console.log('updateService error');
                  // console.log(err, err.stack);
                  reject(err);
                }
                else {
                  // console.log('updateService data');
                  // console.log(data);
                  resolve();
                }
              });
            } else {
              resolve();
            }
          });
        });
      }, 0)
      .done(function(){
        // All scaling done
        resolve();
      }, function(err){
        // Scaling has failed
        reject(err);
      });
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
