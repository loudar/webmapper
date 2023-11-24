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
order by count(`ll`.`target_id`) desc