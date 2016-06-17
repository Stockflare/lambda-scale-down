# Lambda Scale Down

Some of our ECS Service scaling strategies are triggered by message queue sizes and surge queues, these work well for scaling up but are somewhat unreliable for scaling down.  This lambda function will be triggered at set times each day (after harvests) and will scale all services on the cluster down to our preferred minimum service instance count.

The function will simply examine each running service and a service that has an instance count greater than `count` will have its desired instances set to `count`

```
{
  "cluster": "ecs-ECSCluster-1CGZ6A9RQ9F37",
  "count": 6,
  "region": "us-east-1"
}
```
