import TitleBar from "../components/bars/TitleBar";
import ListView from "../containers/ListView";
import { useState } from "react";
import CollectionCard from "../components/CollectionCard";
import theme from "../constants/theme";
import Separator from "../components/utils/Separator";
import InfinityScroll from "../containers/InfinityScroll";
import { useApiFeed } from "../components/hooks/api";
import { Collection } from "../interfaces/Builds";
import {
  SortingBar,
  SortingBarLeft,
  SortingBarRight,
} from "../components/bars/SortingBar";
import SortDropdown from "../components/bars/sortingBar/SortDropdown";
import SearchInput from "../components/bars/sortingBar/SearchInput";
import CategoriesDropdown from "../components/bars/sortingBar/CategoriesDropdown";

const Collections = () => {
  const [params, setParams] = useState({
    sort: "Top",
    name: "",
    category: "",
  });

  const [collections, loading, error, fetchMore, refetch] =
    useApiFeed<Collection>(
      "/collections/get",
      {
        params: {
          sort: params.sort.toLowerCase(),
          name: params.name,
        },
      },
      10
    );

  const doSearch = ({
    name = params.name,
    category = params.category,
    sort = params.sort,
  }) => {
    if (
      name === params.name &&
      category === params.category &&
      sort === params.sort
    )
      return;

    setParams({ ...params, name, category, sort });
    refetch({
      params: {
        name,
        sort: sort.toLowerCase(),
        // category,
      },
    });
  };

  return (
    <div className="collections">
      <TitleBar active="collections" />
      <div className="large-page-container">
        <h1>Collections</h1>
        <p>Browse popular build collections</p>
      </div>
      <div className="page-container">
        <SortingBar>
          <SortingBarLeft>
            <SortDropdown
              sort={params.sort}
              doSearch={(sort) => doSearch({ sort })}
            />
            <SearchInput
              doSearch={(name) => doSearch({ name })}
              placeholder="Search collections"
            />
          </SortingBarLeft>
          <SortingBarRight>
            <CategoriesDropdown
              doSearch={(category) => doSearch({ category })}
              category={params.category}
            />
          </SortingBarRight>
        </SortingBar>
        {Separator}
        <div className="content">
          <InfinityScroll fetchMore={fetchMore}>
            <ListView
              loading={loading && collections?.length === 0}
              error={error}
            >
              {collections.map((c, i) => (
                <CollectionCard key={i} collection={c} />
              ))}
            </ListView>
          </InfinityScroll>
        </div>
      </div>
      <style jsx>
        {`
          .collections {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
          }

          .large-page-container {
            background: linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)),
              url("/mockImages/village.png") no-repeat center center;
            background-size: cover;
          }

          .large-page-container > * {
            color: ${theme.light};
            text-align: center;
          }

          .page-container {
            display: flex;
            flex-direction: column;
            flex: 1 0 auto;
          }

          .content {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
          }
        `}
      </style>
    </div>
  );
};

export default Collections;
