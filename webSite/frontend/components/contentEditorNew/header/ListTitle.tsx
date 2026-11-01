import { useNavigation } from '../../../logic/navigation';
import { PageTitle } from '../../ui';

/**
 * Заголовок над списком — название открытого пункта меню: «Файлы», «Роли».
 * Своего имени у списка в окне настроек нет, поэтому заголовок и меню
 * не расходятся. Где пункт меню списка не называет (элементы типа контента,
 * файлы раздела), раздел заголовок прячет и ставит свой.
 */
export default function ListTitle() {
  const { currentSection } = useNavigation();
  return <PageTitle>{currentSection?.label ?? ' '}</PageTitle>;
}
