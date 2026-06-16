# Backend database strategy

this document will guide the prisma migration startegy before sprint 4 and onwards. This will handle real persistant organisation data

## our current migraion sequence

Committed migrations live in [prisma/migrations](prisma/migrations) and currently apply in this order:

1. `20260426140517_init`
2. `20260511143154_demo1_access_context`
3. `20260511144409_demo1_campaign_training`
4. `20260511151647_demo1_quiz_interactions`
5. `20260511185349_demo1_final_review_cleanup`
6. `20260511204248_demo1_review_adjustments`
7. `20260512120000_user_first_last_name`
8. `20260513205654_modular_campaign_domain_model`
9. `20260515110000_rename_learner_to_trainee`

Please do not squash, rename, delete, or rewrite any old commited migrations. Treat them as the version controlled database history.

## creating the future schema changes:

The future schema changes should start in [prisma/migrations](prisma/migrations), and then create a new migration with:

(in powershell)

pnpm --filter @insightful-phish/backend prisma:migrate --name <migration-name>
