# Page.vue variants

- [ ] Browse
- [ ] Dashboard
- [ ] FileSystem
- [ ] DocumentIndexing
- [ ] Questionnaire
- [ ] Canvas
- [ ] Settings
- [ ] Schedule
- [ ] Help
- [ ] Feed
- [ ] Chat
- [ ] ChatBot
- [ ] Graph

# Proposed route structure

```yaml
# Page Structure Template

name: Page Name
route: /path/to/page
parent: Parent Page or Section

purpose: >
  Brief description of what this page does and why it exists.

access:
  auth_required: true
  tenant_isolation: strict # strict | shared | global

  roles:
    super_admin:
      view: true
      edit: true
      delete: true
      notes: Full access across all tenants
    tenant_admin:
      view: true
      edit: true
      delete: true
      notes: Own tenant only
    manager:
      view: true
      edit: true
      delete: false
    member:
      view: true
      edit: false
      delete: false
    guest:
      view: false
      redirect: /login

  conditions:
    - must_own_resource
    - must_be_in_same_team

data:
  primary_entity: EntityName
  tenant_relationship: belongs_to # belongs_to | shared | global
  related_entities:
    - name: RelatedEntity
      access: inherited # inherited | restricted | public
  cross_tenant: false

sections:
  - name: Section Name
    components:
      - component_type
      - another_component
    actions:
      - create_item
      - edit_item

  - name: Another Section
    components:
      - list_view
    actions:
      - view_details

actions:
  create_item:
    endpoint: POST /api/items
    roles: [tenant_admin, manager]
    tenant_scope: own
    validation:
      - required_fields
      - business_rule

  edit_item:
    endpoint: PATCH /api/items/:id
    roles: [tenant_admin, manager]
    tenant_scope: own
    ownership_required: true

  delete_item:
    endpoint: DELETE /api/items/:id
    roles: [tenant_admin]
    tenant_scope: own

states:
  default: Description of initial load state
  empty: Message or CTA when no data
  error:
    permission_denied: /403
    not_found: /404

navigation:
  links_to:
    - /related/page
    - /another/page
  back_to: /parent/page

notes: >
  Edge cases, known limitations, future considerations.
```
