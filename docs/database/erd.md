# ERD

```mermaid
erDiagram
    USERS ||--|| ACCESSIBILITY_PROFILES : has
    USERS ||--o{ REPORTS : creates
    USERS ||--o{ ROUTES : saves
    USERS ||--o{ NOTIFICATIONS : receives
    PLACES ||--o{ REPORTS : referenced_by
    PLACES ||--o{ PLACE_ACCESSIBILITY_FEATURES : has
    ACCESSIBILITY_FEATURES ||--o{ PLACE_ACCESSIBILITY_FEATURES : mapped_to
    REPORTS ||--o{ REPORT_IMAGES : contains
    REPORTS ||--o{ AI_ANALYSES : analyzed_by
    REPORTS ||--o{ ROUTE_OBSTACLES : linked_to
    ROUTES ||--o{ ROUTE_OBSTACLES : contains
```