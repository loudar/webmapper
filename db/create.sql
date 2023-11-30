create table if not exists webmap.linkcount
(
    count           bigint                               not null,
    interlink_count bigint                               not null,
    created_at      datetime default current_timestamp() not null
        primary key
);

create table if not exists webmap.links
(
    id         bigint auto_increment
        primary key,
    link       text                                 not null,
    host       varchar(255)                         not null,
    status     int                                  null,
    content    longtext                             null,
    updated_at datetime default current_timestamp() not null on update current_timestamp(),
    constraint links_pk
        unique (link) using hash
);

create fulltext index if not exists links_content_link_index
    on webmap.links (content, link);

create index if not exists links_host_index
    on webmap.links (host);

create index if not exists links_updated_at_index
    on webmap.links (updated_at desc);

create table if not exists webmap.links_linked
(
    origin_id bigint not null,
    target_id bigint not null,
    primary key (origin_id, target_id),
    constraint links_linked_links_id_fk
        foreign key (origin_id) references webmap.links (id)
            on delete cascade,
    constraint links_linked_links_id_fk2
        foreign key (target_id) references webmap.links (id)
            on delete cascade
);

create table if not exists webmap.users
(
    id         bigint auto_increment
        primary key,
    username   varchar(128)                         not null,
    password   varchar(128)                         not null,
    created_at datetime default current_timestamp() not null,
    updated_at datetime default current_timestamp() not null on update current_timestamp()
);

create table if not exists webmap.search_history
(
    search_id bigint auto_increment
        primary key,
    user_id   bigint                               not null,
    query     text                                 not null,
    created_a datetime default current_timestamp() not null,
    constraint search_history_users_id_fk
        foreign key (user_id) references webmap.users (id)
            on delete cascade
);

create definer = root@`%` view if not exists webmap.domainlinks as
select substring_index(`webmap`.`links`.`host`, '.', -2)            AS `domain`,
       group_concat(distinct `webmap`.`links`.`host` separator ',') AS `subdomains`,
       count(`ll`.`target_id`)                                      AS `outgoing_link_count`,
       group_concat(distinct
                    concat(substring_index(`l2`.`host`, '.', -2), '(', coalesce(`l2`.`incoming_link_count`, 0), ')')
                    separator ',')                                  AS `target_domains`
from ((`webmap`.`links` left join `webmap`.`links_linked` `ll`
       on (`webmap`.`links`.`id` = `ll`.`origin_id`)) left join (select `l2`.`id`                AS `id`,
                                                                        `l2`.`host`              AS `host`,
                                                                        count(`ll2`.`origin_id`) AS `incoming_link_count`
                                                                 from (`webmap`.`links` `l2` left join `webmap`.`links_linked` `ll2`
                                                                       on (`l2`.`id` = `ll2`.`target_id`))
                                                                 group by `l2`.`id`, `l2`.`host`) `l2`
      on (`ll`.`target_id` = `l2`.`id`))
group by substring_index(`webmap`.`links`.`host`, '.', -2)
order by count(`ll`.`target_id`) desc;

create definer = root@`%` event if not exists webmap.linkcount on schedule
    every '5' MINUTE
        starts '2023-11-27 14:16:01'
    enable
    do
    INSERT INTO linkcount (count, interlink_count)
    SELECT
        (SELECT count(*) FROM links),
        (SELECT count(*) FROM links_linked);

