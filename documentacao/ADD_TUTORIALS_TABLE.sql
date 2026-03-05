-- nova tabela para armazenar vídeos/tutorials
CREATE TABLE IF NOT EXISTS `Tutoriais` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `setor` VARCHAR(50) NOT NULL,
  `titulo` VARCHAR(150) NOT NULL,
  `descricao` TEXT NOT NULL,
  `data_publicacao` DATE NOT NULL,
  `url` VARCHAR(500) NOT NULL,
  `publicado_por_admin_id` INT NULL,
  `publicado_por_nome` VARCHAR(100) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
